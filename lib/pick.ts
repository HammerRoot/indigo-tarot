// 牌桌抽牌选牌工具(规格 G6)
// 从真实牌组中按"用户点击的索引"取牌,保证点击的牌就是抽到的牌。
import { TarotCard } from "./tarot-data";

/**
 * 按点击索引从牌组中取牌:
 * - 严格保持点击顺序;
 * - 重复索引去重(同一张牌不可重复选择);
 * - 越界索引忽略;
 * - 结果无重复。
 */
export function pickCardsByIndex(
  deck: readonly TarotCard[],
  indexes: readonly number[],
): TarotCard[] {
  const seen = new Set<number>();
  const picked: TarotCard[] = [];
  for (const index of indexes) {
    if (seen.has(index)) continue;
    seen.add(index);
    const card = deck[index];
    if (card) picked.push(card);
  }
  return picked;
}
