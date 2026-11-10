// 代码题的作答框架：按语言写好函数签名和固定部分，关键步骤留成 TODO，学习者只需补全 TODO。
// 选了哪种语言，作答框就预填哪种语言的框架；参考答案仍是完整的函数（见 code-refs）。
import type {StarterMap} from './types';

export const rrfStarters:StarterMap={
'ai-x2-32':{
python:String.raw`def rrf(lists: list[list[str]], k: int = 60) -> list[str]:
    score: dict[str, float] = {}  # 文档 id -> 总分

    for ranked in lists:
        # TODO 1：遍历这一路的每个文档，同时拿到它的排名（第一名是 1）
        for ... in ...:
            # TODO 2：把 1 / (k + rank) 加到这个文档的总分上（第一次出现时从 0 开始加）
            ...

    # TODO 3：把所有文档 id 按总分从高到低排序后返回
    return ...`,
go:String.raw`func RRF(lists [][]string, k int) []string {
    score := map[string]float64{} // 文档 id -> 总分

    for _, list := range lists {
        // TODO 1：遍历这一路的每个文档，同时拿到它的排名（注意 range 的下标从 0 开始）
        for ... {
            // TODO 2：把 1 / (k + rank) 加到这个文档的总分上（整数要先转成 float64 再相除）
        }
    }

    ids := make([]string, 0, len(score))
    for id := range score {
        ids = append(ids, id)
    }
    // TODO 3：按总分从高到低排序 ids（可以用 sort.Slice）

    return ids
}`,
java:String.raw`static List<String> rrf(List<List<String>> lists, int k) {
    Map<String, Double> score = new HashMap<>(); // 文档 id -> 总分

    for (List<String> list : lists) {
        // TODO 1：遍历这一路的每个文档，同时拿到它的排名（第一名是 1）
        for (...) {
            // TODO 2：把 1.0 / (k + rank) 加到这个文档的总分上（可以用 score.merge）
        }
    }

    List<String> ids = new ArrayList<>(score.keySet());
    // TODO 3：按总分从高到低排序 ids

    return ids;
}`,
ts:String.raw`function rrf(lists: string[][], k = 60): string[] {
  const score = new Map<string, number>(); // 文档 id -> 总分

  for (const list of lists) {
    // TODO 1：遍历这一路的每个文档，同时拿到它的排名（forEach 的下标从 0 开始）
    list.forEach((id, i) => {
      // TODO 2：把 1 / (k + rank) 加到这个文档的总分上（第一次出现时从 0 开始加）
    });
  }

  // TODO 3：把所有文档 id 按总分从高到低排序后返回
  return [...score.keys()];
}`,
rust:String.raw`use std::collections::HashMap;

fn rrf(lists: &[Vec<String>], k: f64) -> Vec<String> {
    let mut score: HashMap<&str, f64> = HashMap::new(); // 文档 id -> 总分

    for list in lists {
        // TODO 1：遍历这一路的每个文档，同时拿到它的排名（enumerate 的下标从 0 开始）
        for ... {
            // TODO 2：把 1.0 / (k + rank) 加到这个文档的总分上（可以用 entry().or_insert(0.0)）
        }
    }

    let mut ids: Vec<&str> = score.keys().copied().collect();
    // TODO 3：按总分从高到低排序 ids（分数是 f64，用 partial_cmp 比较）

    ids.into_iter().map(String::from).collect()
}`,
},
};

