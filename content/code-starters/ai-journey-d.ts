import type {StarterMap} from './types';

// AI 闯关题 evals-12（分类评测）、evals-h2（新旧版本对比）的作答框架。
export const aiJourneyStartersD:StarterMap={
'evals-12':{
python:String.raw`def evaluate(dataset):
    failures = []
    for item in dataset:
        # TODO 1：调用 classify(item["text"])，和期望标签 item["label"] 比较
        # TODO 2：答错时把这条数据连同预测结果一起存进 failures，方便之后分析
        ...
    # TODO 3：算出准确率（答对的比例）
    accuracy = ...
    return accuracy, failures`,
go:String.raw`type Item struct {
    Text, Label string
}

type Failure struct {
    Item
    Pred string // 模型给出的错误答案
}

func evaluate(dataset []Item) (float64, []Failure) {
    if len(dataset) == 0 {
        return 0, nil
    }
    var failures []Failure
    for _, it := range dataset {
        // TODO 1：调用 classify(it.Text)，和期望标签 it.Label 比较
        // TODO 2：答错时把这条数据连同预测结果一起存进 failures
        ...
    }
    // TODO 3：算出准确率（转成 float64 再相除）
    accuracy := ...
    return accuracy, failures
}`,
java:String.raw`record Item(String text, String label) {}
record Failure(Item item, String pred) {}
record EvalResult(double accuracy, List<Failure> failures) {}

static EvalResult evaluate(List<Item> dataset) {
    List<Failure> failures = new ArrayList<>();
    for (Item it : dataset) {
        // TODO 1：调用 classify(it.text())，和期望标签 it.label() 比较
        // TODO 2：答错时把这条数据连同预测结果一起存进 failures
        ...
    }
    // TODO 3：算出准确率（数据集为空时为 0，注意用小数除法）
    double accuracy = ...;
    return new EvalResult(accuracy, failures);
}`,
ts:String.raw`type Item = { text: string; label: string };

async function evaluate(dataset: Item[]) {
  const failures: (Item & { pred: string })[] = [];
  for (const item of dataset) {
    // TODO 1：调用 await classify(item.text)，和期望标签 item.label 比较
    // TODO 2：答错时把这条数据连同预测结果一起存进 failures
    ...
  }
  // TODO 3：算出准确率（数据集为空时为 0）
  const accuracy = ...;
  return { accuracy, failures };
}`,
rust:String.raw`struct Item {
    text: String,
    label: String,
}

// 返回 (准确率, 答错的样本及模型的预测)
fn evaluate(dataset: &[Item]) -> (f64, Vec<(&Item, String)>) {
    let mut failures = Vec::new();
    for item in dataset {
        // TODO 1：调用 classify(&item.text)，和期望标签 item.label 比较
        // TODO 2：答错时把 (item, 预测) 存进 failures
        ...
    }
    if dataset.is_empty() {
        return (0.0, failures);
    }
    // TODO 3：算出准确率（转成 f64 再相除）
    let accuracy = ...;
    (accuracy, failures)
}`,
},

'evals-h2':{
python:String.raw`def compare(dataset, old_fn, new_fn, check):
    fixed, broken = [], []
    for item in dataset:
        # TODO 1：分别用旧版本和新版本跑 item["input"]，再用 check 判断是否通过
        old_ok = ...
        new_ok = ...
        # TODO 2：旧版没过、新版过了 → 记入 fixed；旧版过了、新版没过 → 记入 broken（记题目 id）
        ...
    # TODO 3：返回 fixed、broken 和净变化（修好的数量 - 弄坏的数量）
    return ...`,
go:String.raw`type Diff struct {
    Fixed, Broken []string
    Net           int
}

func compare(dataset []Item, oldFn, newFn func(string) string, check func(Item, string) bool) Diff {
    var d Diff
    for _, it := range dataset {
        // TODO 1：分别用旧版本和新版本跑 it.Input，再用 check 判断是否通过
        oldOK := ...
        newOK := ...
        // TODO 2：旧版没过、新版过了 → 记入 d.Fixed；旧版过了、新版没过 → 记入 d.Broken（记 it.ID）
        ...
    }
    // TODO 3：算出净变化（修好的数量 - 弄坏的数量）
    ...
    return d
}`,
java:String.raw`record Diff(List<String> fixed, List<String> broken, int net) {}

static Diff compare(List<Item> dataset, Function<String, String> oldFn,
                    Function<String, String> newFn, BiPredicate<Item, String> check) {
    List<String> fixed = new ArrayList<>(), broken = new ArrayList<>();
    for (Item it : dataset) {
        // TODO 1：分别用旧版本和新版本跑 it.input()，再用 check.test 判断是否通过
        boolean oldOk = ...;
        boolean newOk = ...;
        // TODO 2：旧版没过、新版过了 → 记入 fixed；旧版过了、新版没过 → 记入 broken（记 it.id()）
        ...
    }
    // TODO 3：返回 fixed、broken 和净变化（修好的数量 - 弄坏的数量）
    return ...;
}`,
ts:String.raw`type Item = { id: string; input: string; expected: string };

function compare(
  dataset: Item[],
  oldFn: (input: string) => string,
  newFn: (input: string) => string,
  check: (item: Item, output: string) => boolean,
) {
  const fixed: string[] = [], broken: string[] = [];
  for (const item of dataset) {
    // TODO 1：分别用旧版本和新版本跑 item.input，再用 check 判断是否通过
    const oldOk = ...;
    const newOk = ...;
    // TODO 2：旧版没过、新版过了 → 记入 fixed；旧版过了、新版没过 → 记入 broken（记 item.id）
    ...
  }
  // TODO 3：返回 fixed、broken 和净变化（修好的数量 - 弄坏的数量）
  return ...;
}`,
rust:String.raw`struct Diff {
    fixed: Vec<String>,
    broken: Vec<String>,
    net: i64,
}

fn compare(
    dataset: &[Item],
    old_fn: impl Fn(&str) -> String,
    new_fn: impl Fn(&str) -> String,
    check: impl Fn(&Item, &str) -> bool,
) -> Diff {
    let (mut fixed, mut broken) = (Vec::new(), Vec::new());
    for item in dataset {
        // TODO 1：分别用旧版本和新版本跑 item.input，再用 check 判断是否通过
        let old_ok = ...;
        let new_ok = ...;
        // TODO 2：旧版没过、新版过了 → 记入 fixed；旧版过了、新版没过 → 记入 broken（记 item.id.clone()）
        ...
    }
    // TODO 3：算出净变化（修好的数量 - 弄坏的数量），返回 Diff
    ...
}`,
},
};
