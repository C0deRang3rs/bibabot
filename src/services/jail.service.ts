import moment from 'moment';
import { Context } from 'telegraf/typings/context';
import { Message, MessageEntity } from 'telegraf/typings/core/types/typegram';
import CheckConfig from '../decorators/check.config.decorator';
import CommandTemplate from '../decorators/command.template.decorator';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import ReplyWithError from '../decorators/reply.with.error.decorator';
import BibaRepository from '../repositories/biba.repo';
import ConfigRepository from '../repositories/config.repo';
import { BotCommandType, BotListener, CommandType } from '../types/core/bot.types';
import { CommandCategory, JailCommand } from '../types/globals/commands.types';
import RepliableError from '../types/globals/repliable.error';
import { ConfigProperty, IndividualConfigProperty } from '../types/services/config.service.types';
import { YEAR_IN_MINUTES } from '../types/services/jail.service.types';
import { JailPoll, PollAnswer, PollType } from '../types/services/poll.service.types';
import optional from '../utils/decorators.utils';
import plural from '../utils/pluralize.utils';
import BaseService from './base.service';
import PollService from './poll.service';

export default class JailService extends BaseService {
  private static instance: JailService;

  private constructor(
    private readonly bibaRepo: BibaRepository,
    private readonly configRepo: ConfigRepository,
    private readonly pollService: PollService,
  ) {
    super();
    this.pollService.setHandler(PollType.VOTE_BAN, this.voteHandler.bind(this));
  }

  public static getInstance(): JailService {
    if (!JailService.instance) {
      JailService.instance = new JailService(
        new BibaRepository(),
        new ConfigRepository(),
        PollService.getInstance(),
      );
    }

    return JailService.instance;
  }

  @DeleteRequestMessage()
  @ReplyWithError()
  @CommandTemplate([CommandType.COMMAND, CommandType.NUMBER])
  private async changeJailMinVote(ctx: Context): Promise<Message> {
    if (
      !ctx.from
      || !ctx.chat
      || !ctx.message
      || !('text' in ctx.message)
    ) {
      throw new Error('Wrong context');
    }

    // TODO: вынести команды для создателя чата / админов с высокими правами
    const chatId = ctx.chat.id;
    const admins = await this.bot.app.telegram.getChatAdministrators(ctx.chat.id);
    const isUserCreator = admins.find((user) => user.user.id === ctx.from!.id)?.status === 'creator';

    if (!isUserCreator) {
      throw new RepliableError('Команда доступна только основателю чата', ctx);
    }

    const membersCount = await this.bot.app.telegram.getChatMembersCount(chatId);
    const minVoteCount = parseInt(ctx.message.text.split(' ')[1], 10);

    if (minVoteCount > membersCount) {
      throw new RepliableError('Нельзя указать больше чем кол-во пользователей в чате', ctx);
    }

    if (minVoteCount <= 1) {
      throw new RepliableError('Нельзя указать меньше чем 2', ctx);
    }

    await this.configRepo.setConfigIndividualProperty(
      chatId,
      IndividualConfigProperty.JAIL_MIN_VOTE_COUNT,
      minVoteCount.toString(),
    );

    return ctx.reply(`Минимальное количество голосов для бана изменено на ${minVoteCount}`);
  }

  @DeleteRequestMessage()
  @ReplyWithError()
  @CheckConfig(ConfigProperty.JAIL)
  @CommandTemplate([CommandType.COMMAND, CommandType.USER_MENTION, optional(CommandType.NUMBER)])
  private async voteban(ctx: Context): Promise<void> {
    if (
      !ctx.from
      || !ctx.chat
      || !ctx.message
      || !('text' in ctx.message)
    ) {
      throw new Error('Wrong context');
    }

    const userMention = ctx.message.text.split(' ')[1];

    if (!userMention) throw new RepliableError('Укажи кого банить', ctx);

    const mentions = ctx.message.entities!.filter((i) => i.type === 'mention' || i.type === 'text_mention') as MessageEntity[];

    if (!mentions.length) throw new RepliableError('Укажи кого банить', ctx);
    if (mentions.length > 1) throw new RepliableError('За раз можно забанить только одну суку', ctx);

    const chatId = ctx.chat.id;
    const userId = 'user' in mentions[0]
      ? mentions[0].user.id
      : (await this.bibaRepo.findBibaByUsernameInChat(chatId, userMention))?.userId;

    if (!userId) {
      throw new RepliableError('У этого пользователя ни разу не было бибы', ctx);
    }

    const params = ctx.message.text.split(' ');
    const timeParam = params[2];

    if (timeParam && Number.isNaN(Number(params[2]))) throw new RepliableError('Wrong format', ctx);

    const requestedTime = parseInt(params[2], 10);

    if (timeParam && (!requestedTime || requestedTime <= 0)) throw new RepliableError('Wrong format', ctx);

    const banTime = requestedTime > YEAR_IN_MINUTES ? Number.POSITIVE_INFINITY : requestedTime || 1440;

    const membersCount = await this.bot.app.telegram.getChatMembersCount(chatId);
    const defaultMinVoteCount = Math.floor(membersCount / 2).toString();
    const configMinVoteCount = await this.configRepo.getConfigIndividualProperty(
      chatId,
      IndividualConfigProperty.JAIL_MIN_VOTE_COUNT,
      defaultMinVoteCount,
    );
    const minVoteCount = parseInt(configMinVoteCount!, 10);
    const releaseDate = moment().add(banTime, 'minutes').toDate();

    await this.pollService.createPoll<JailPoll>(
      {
        // eslint-disable-next-line max-len
        title: `Забанить эту суку ${userMention}${banTime > YEAR_IN_MINUTES ? ' навсегда' : banTime !== 1440 ? ` на ${banTime} мин` : ' на день'}? Минимум ${minVoteCount} ${plural(['голос', 'голоса', 'голосов'], minVoteCount)}`,
        options: [PollAnswer.YES, PollAnswer.NO],
        extra: { is_anonymous: false },
        minVoteCount,
        releaseDate,
        pollType: PollType.VOTE_BAN,
        chatId,
        userId,
      } as JailPoll,
    );
  }

  public async imprisonUser(
    chatId: number,
    userId: number,
    releaseDate: Date = moment().toDate(),
  ): Promise<void> {
    await this.bot.app.telegram.restrictChatMember(chatId, userId, {
      permissions: {
        can_send_messages: false,
      },
      until_date: moment(releaseDate).unix(),
    });

    const user = await this.bibaRepo.getBibaByIds(chatId, userId);

    if (user) {
      const message = releaseDate
        ? `${user.username}, ты в бане, клоун! Возвращайся ${moment(releaseDate).fromNow()}.`
        : `${user.username}, прощай, клоун 🤡. Ты в бане навсегда.`;
      await this.bot.app.telegram.sendMessage(chatId, message);
    }
  }

  public async voteHandler(ctx: Context, poll: JailPoll): Promise<void> {
    const {
      minVoteCount,
      chatId,
      userId,
      pollId,
      messageId,
      releaseDate,
    } = poll;

    const positiveVotes = ctx.poll!.options.find((option) => option.text === PollAnswer.YES)!.voter_count;
    const negativeVotes = ctx.poll!.options.find((option) => option.text === PollAnswer.NO)!.voter_count;
    const isPositiveWon = positiveVotes >= minVoteCount;
    const isNegativeWon = negativeVotes >= minVoteCount;

    if (isPositiveWon) {
      await this.imprisonUser(chatId, userId, releaseDate);
    }

    if (isNegativeWon) {
      await this.bot.app.telegram.sendMessage(chatId, 'Ладно, поживи ещё');
    }

    if (isPositiveWon || isNegativeWon) {
      await this.pollService.stopPoll(pollId, chatId, messageId);
    }
  }

  protected initProps(): void {
    this.categoryName = CommandCategory.JAIL;
  }

  protected initListeners(): BotListener[] {
    return [
      {
        type: BotCommandType.COMMAND,
        name: JailCommand.VOTEBAN,
        description: 'Выставить пользователя на голосование за мут в чате на сутки. [можно указать время бана в минутах]',
        callback: (ctx): Promise<void> => this.voteban(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: JailCommand.MIN_VOTE_COUNT,
        description: 'Изменить колво голосов для бана. (Доступно только для основателя чата)',
        callback: (ctx): Promise<Message> => this.changeJailMinVote(ctx),
      },
    ] as BotListener[];
  }
}
