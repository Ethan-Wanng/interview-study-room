import type {StarterMap} from './types';

// 后端题 be-ds-10（链表判环）、be-algo-10（反转链表）、be-x1-37（两数之和）的作答框架。
export const backendStartersA:StarterMap={
'be-ds-10':{
python:String.raw`def has_cycle(head) -> bool:
    slow = fast = head
    # TODO 1：fast 或 fast.next 为空时说明走到了尽头，没有环（写出循环条件）
    while ...:
        # TODO 2：慢指针每次走一步，快指针每次走两步
        ...
        # TODO 3：两个指针指向同一个节点（用 is 比较）说明有环
        ...
    return False`,
go:String.raw`func hasCycle(head *Node) bool {
    slow, fast := head, head
    // TODO 1：fast 或 fast.Next 为 nil 时说明走到了尽头，没有环（写出循环条件）
    for ... {
        // TODO 2：慢指针每次走一步，快指针每次走两步
        ...
        // TODO 3：两个指针相遇说明有环
        ...
    }
    return false
}`,
java:String.raw`static boolean hasCycle(Node head) {
    Node slow = head, fast = head;
    // TODO 1：fast 或 fast.next 为 null 时说明走到了尽头，没有环（写出循环条件）
    while (...) {
        // TODO 2：慢指针每次走一步，快指针每次走两步
        ...
        // TODO 3：两个指针相遇（同一个对象）说明有环
        ...
    }
    return false;
}`,
ts:String.raw`function hasCycle(head: ListNode | null): boolean {
  let slow = head, fast = head;
  // TODO 1：fast 或 fast.next 为空时说明走到了尽头，没有环（写出循环条件）
  while (...) {
    // TODO 2：慢指针每次走一步，快指针每次走两步
    ...
    // TODO 3：两个指针相遇（===）说明有环
    ...
  }
  return false;
}`,
rust:String.raw`// Rust 的所有权规则让“有环链表”很难用普通 Box 写出来，
// 这里把节点放在数组里，next 存下一个节点的下标（None 表示结尾）
struct Node {
    next: Option<usize>,
}

fn has_cycle(nodes: &[Node], head: Option<usize>) -> bool {
    let (mut slow, mut fast) = (head, head);
    while let Some(f) = fast {
        // TODO 1：快指针每次走两步；任何一步走到 None 都说明没有环，返回 false
        ...
        // TODO 2：慢指针每次走一步
        ...
        // TODO 3：两个指针相遇（并且不是 None）说明有环
        ...
    }
    false
}`,
},

'be-algo-10':{
python:String.raw`class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def reverse(head):
    prev = None
    cur = head
    while cur:
        # TODO 1：先保存下一个节点，否则改完指向就找不到了
        nxt = ...
        # TODO 2：当前节点改为指向前一个
        ...
        # TODO 3：prev 和 cur 都向后移一步
        ...
    # TODO 4：循环结束时 prev 就是新的头节点（空链表时它仍是 None）
    return ...`,
go:String.raw`type Node struct {
    Val  int
    Next *Node
}

func Reverse(head *Node) *Node {
    var prev *Node
    for cur := head; cur != nil; {
        // TODO 1：先保存下一个节点，否则改完指向就找不到了
        next := ...
        // TODO 2：当前节点改为指向前一个
        ...
        // TODO 3：prev 和 cur 都向后移一步
        ...
    }
    // TODO 4：循环结束时 prev 就是新的头节点（空链表时它是 nil）
    return ...
}`,
java:String.raw`class Node {
    int val;
    Node next;
    Node(int val) { this.val = val; }
}

static Node reverse(Node head) {
    Node prev = null, cur = head;
    while (cur != null) {
        // TODO 1：先保存下一个节点，否则改完指向就找不到了
        Node next = ...;
        // TODO 2：当前节点改为指向前一个
        ...
        // TODO 3：prev 和 cur 都向后移一步
        ...
    }
    // TODO 4：循环结束时 prev 就是新的头节点（空链表时它是 null）
    return ...;
}`,
ts:String.raw`type ListNode = { val: number; next: ListNode | null };

function reverse(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let cur = head;
  while (cur) {
    // TODO 1：先保存下一个节点，否则改完指向就找不到了
    const next: ListNode | null = ...;
    // TODO 2：当前节点改为指向前一个
    ...
    // TODO 3：prev 和 cur 都向后移一步
    ...
  }
  // TODO 4：循环结束时 prev 就是新的头节点（空链表时它是 null）
  return ...;
}`,
rust:String.raw`struct Node {
    val: i32,
    next: Option<Box<Node>>, // Box 把下一个节点放在堆上；None 表示结尾
}

fn reverse(head: Option<Box<Node>>) -> Option<Box<Node>> {
    let mut prev = None;
    let mut cur = head;
    while let Some(mut node) = cur {
        // TODO 1：先取出下一个节点（node.next.take() 会把原位置变成 None）
        cur = ...;
        // TODO 2：当前节点改为指向前一个
        ...
        // TODO 3：当前节点成为新的 prev
        ...
    }
    // TODO 4：循环结束时 prev 就是新的头节点（空链表时它是 None）
    ...
}`,
},

'be-x1-37':{
python:String.raw`def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    seen = {}  # 值 → 下标
    # TODO 1：一次遍历，同时拿到下标和值
    for ... in ...:
        # TODO 2：先查 target - v 是否已经见过，见过就返回两个下标
        ...
        # TODO 3：再把当前值和下标存进 seen（先查再存，避免把自己用两次）
        ...
    return None  # 找不到`,
go:String.raw`func twoSum(nums []int, target int) (int, int, bool) {
    seen := make(map[int]int) // 值 → 下标
    for i, v := range nums {
        // TODO 1：先查 target - v 是否已经见过，见过就返回两个下标和 true
        ...
        // TODO 2：再把当前值和下标存进 seen（先查再存，避免把自己用两次）
        ...
    }
    // TODO 3：找不到时返回 false
    ...
}`,
java:String.raw`// 找不到时返回 null
static int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>(); // 值 → 下标
    for (int i = 0; i < nums.length; i++) {
        // TODO 1：先查 target - nums[i] 是否已经见过，见过就返回两个下标
        ...
        // TODO 2：再把当前值和下标存进 seen（先查再存，避免把自己用两次）
        ...
    }
    // TODO 3：找不到时返回 null
    ...
}`,
ts:String.raw`function twoSum(nums: number[], target: number): [number, number] | null {
  const seen = new Map<number, number>(); // 值 → 下标
  for (let i = 0; i < nums.length; i++) {
    // TODO 1：先查 target - nums[i] 是否已经见过，见过就返回两个下标
    ...
    // TODO 2：再把当前值和下标存进 seen（先查再存，避免把自己用两次）
    ...
  }
  // TODO 3：找不到时返回 null
  ...
}`,
rust:String.raw`use std::collections::HashMap;

fn two_sum(nums: &[i32], target: i32) -> Option<(usize, usize)> {
    let mut seen = HashMap::new(); // 值 → 下标
    for (i, &v) in nums.iter().enumerate() {
        // TODO 1：先查 target - v 是否已经见过，见过就返回 Some((那个下标, i))
        ...
        // TODO 2：再把当前值和下标存进 seen（先查再存，避免把自己用两次）
        ...
    }
    // TODO 3：找不到时返回 None
    ...
}`,
},
};
