import type { GameDefinition, GameKey } from '../types';
import { genshinData } from './genshinData';
import { sampleData as starRailData } from './sampleData';

export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    key: 'starRail',
    label: '崩坏：星穹铁道',
    shortLabel: '星铁',
    title: '星穹铁道成就分析',
    subtitle: 'Star Rail Tracker',
    rewardLabel: '星琼',
    defaultVersion: '4.3',
    defaultCollection: '与你同行的回忆',
    defaultAchievementType: '非隐藏成就',
    resetLabel: '4.3 成就大全数据',
    records: starRailData.map((record) => ({ ...record, game: 'starRail' as const })),
  },
  {
    key: 'genshin',
    label: '原神',
    shortLabel: '原神',
    title: '原神成就分析',
    subtitle: 'Genshin Tracker',
    rewardLabel: '原石',
    defaultVersion: '6.6',
    defaultCollection: '天地万象',
    defaultAchievementType: '非隐藏成就',
    resetLabel: '6.6 成就系统数据',
    records: genshinData,
  },
];

export function getGameDefinition(gameKey: GameKey): GameDefinition {
  return GAME_DEFINITIONS.find((game) => game.key === gameKey) || GAME_DEFINITIONS[0];
}
