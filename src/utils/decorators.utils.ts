import { CommandType } from '../types/core/bot.types';

const optional = (commandType: CommandType): CommandType => `${commandType}?` as CommandType;

export default optional;
