// English edition of the "harness" lesson cards. Same card count and order as the Chinese deck.
import type {AiLesson} from '../journey';

export const harnessEn:AiLesson[]=[
 {title:'What a harness is: Agent = Model + Harness',body:`Give two teams the exact same model, and one succeeds 40% of the time while the other ships reliably at 80%+. The difference usually lies not in the weights, but in the outer shell around the model: the Harness.
If the model is the probabilistic reasoning core, the Harness is the deterministic control plane and workbench around it: rule injection, the Agent-Computer Interface (ACI), progressive Skills, lifecycle Hooks, external progress files, sandboxing, and automated verification gates.
The core shift in mindset: stop praying that a polite line in the prompt will be remembered 20 turns later—put permissions, validation and test gates into deterministic code.`},
 {title:'Layered project rules: AGENTS.md and path-scoped rules',body:`Before a coding or workspace agent acts, it needs to know the repo’s conventions. Rules are typically loaded in layers:
1. Global rules: personal style and universal safety constraints;
2. Repo root file (such as AGENTS.md or CLAUDE.md): build/test commands, project layout and hard red lines;
3. Path-scoped rules: loaded on demand only when the agent touches files matching a directory or glob (such as database migrations or frontend components).
Keep root instructions high-signal and concise: include only conventions the model cannot guess from the code itself, rather than dumping a huge handbook into every prompt.`},
 {title:'Hooks: welding checks into the agent lifecycle',body:`A prompt line saying “remember to run tests before finishing” is easy to forget mid-task. Lifecycle Hooks are deterministic scripts enforced by the Harness at fixed points:
1. PreToolUse: validate arguments, block out-of-workspace paths or dangerous shell commands, and mask secrets before a tool runs;
2. PostToolUse: run formatters, linters or targeted unit tests right after an edit, feeding errors straight back into context;
3. Stop / Completion Gate: when the model tries to finish, run verification checks automatically and reject premature completion if anything fails.`,
  code:`def step_with_hooks(tool_call, workspace):
    if not pre_tool_check(tool_call, workspace):
        return {"blocked": True, "reason": "Blocked out-of-workspace write or unsafe command"}
    output = run_tool(tool_call)
    return post_tool_format_and_test(tool_call, output)`,
  explain:[
   {at:'def step_with_hooks',text:'Wrap each tool invocation inside deterministic pre- and post-hooks rather than relying on model willpower.'},
   {at:'if not pre_tool_check',to:'return {"blocked"',text:'PreToolUse hook: verify path boundaries and command safety first; block with a clear explanation if invalid.'},
   {at:'output = run_tool(tool_call)',text:'Execute the underlying tool only after pre-checks pass.'},
   {at:'return post_tool_format_and_test',text:'PostToolUse hook: format modified files, run fast checks or truncate noisy logs before returning the observation.'}]},
 {title:'Try it: build a Stop Hook completion gate',body:`Coding agents often declare “fixed!” right after a partial edit without checking edge cases. Let’s simulate a deterministic Stop Hook in Python: round 1 misses negative numbers, gets blocked with the test failure, and round 2 passes.`,
  practice:{steps:['Check that Python 3 is installed (run python --version or python3 --version).','Create a file called stop_hook.py and paste the code below.','Run python stop_hook.py and watch round 1 get rejected by the gate before round 2 passes.'],expect:`Step 1: model submits def add(a, b): return a + abs(b)
Stop Hook blocked: add(2, -1) expected 1, got 3 (returning to fix)
Step 2: model submits def add(a, b): return a + b
Stop Hook passed: all tests green`},
  code:`drafts = [
    ("def add(a, b): return a + abs(b)", lambda a, b: a + abs(b)),
    ("def add(a, b): return a + b", lambda a, b: a + b),
]

def stop_hook(fn):
    for a, b, want in [(2, 3, 5), (2, -1, 1)]:
        got = fn(a, b)
        if got != want:
            return False, f"add({a}, {b}) expected {want}, got {got}"
    return True, "all tests green"

for step, (source, fn) in enumerate(drafts, start=1):
    print(f"Step {step}: model submits {source}")
    ok, msg = stop_hook(fn)
    if ok:
        print(f"Stop Hook passed: {msg}")
        break
    print(f"Stop Hook blocked: {msg} (returning to fix)")`,
  explain:[
   {at:'drafts = [',to:']',text:'Simulate two model iterations: the first draft mistakenly uses abs(b) and fails on negative inputs, while the second implements a + b.'},
   {at:'def stop_hook(fn):',text:'Define the deterministic Stop Hook run by the Harness whenever the agent attempts to finish.'},
   {at:'for a, b, want',to:'return True, "all tests green"',text:'Run every test case; return False with the exact mismatch on failure, or True when all pass.'},
   {at:'for step,',to:'ok, msg = stop_hook(fn)',text:'Simulate the agent loop submitting each edit and triggering the completion gate.'},
   {at:'if ok:',to:'break',text:'Only when the gate passes does the loop exit cleanly.'},
   {at:'print(f"Stop Hook blocked',text:'When blocked, the Harness feeds the failure back into context so the model fixes the bug.'}]},
 {title:'ACI design: ergonomics for models, not humans',body:`UI and REST APIs are built for humans; an ACI (Agent-Computer Interface) is built around LLM token budgets and error recovery. Good ACI design often beats upgrading to a larger model:
1. Targeted edits over whole-file rewrites: offer search-and-replace, line-range edits or diffs instead of rewriting 1,000 lines to change 3 (fewer output tokens and fewer dropped lines);
2. CLIs vs dozens of overlapping JSON tools: inside a sandbox, standard CLIs (git, rg, pytest) with exit codes and --help are composable and compact;
3. Self-healing errors: return actionable guidance (“match not found; call read_file on lines 40-80 first”) instead of a bare 500.`},
 {title:'Preventing context blowups: truncation and file pointers',body:`A single test run can dump 30,000 lines of logs and ruin the model’s attention across the whole window.
Harnesses guard outputs in three ways:
1. Truncate oversized outputs: keep the head summary and the trailing stack trace when output exceeds a character budget;
2. Spill to disk with a pointer: write the full log to a temporary artifact file and return its path and line count so the agent can grep or slice it on demand;
3. Compact search results: return file paths, line numbers and brief snippets instead of entire source files.`},
 {title:'Agent Skills: packaging domain workflows for reuse',body:`Teams hit a dilemma: stuffing every SOP, checklist and helper script into the System Prompt burns tokens on every call, while exposing 50 tiny tools confuses selection.
An Agent Skill fills the middle layer: a directory built around SKILL.md, optionally bundled with scripts/ and references/.
Whereas MCP standardises “how to connect to external tools and data”, a Skill packages “how to perform this specialised workflow reliably” using reusable instructions and deterministic scripts.`},
 {title:'Progressive disclosure: 100+ skills without blowing the window',body:`Skills scale to dozens or hundreds of capabilities through three-tier progressive disclosure:
1. Discovery (always on): load only lightweight metadata (name + a short trigger description, tens of tokens) at startup;
2. Activation (on demand): once a task matches, read the full SKILL.md instructions into context;
3. Resources & execution (on demand): read references/ or run scripts/ in a sandbox only when needed, keeping complex deterministic logic out of token generation.
Because the upfront skill index stays constant, it also preserves Prompt Cache prefix hits.`,
  code:`def load_skill(skill_name, registry):
    meta = registry[skill_name]                            # Tier 1: tiny index only
    instructions = read_text(meta["path"] + "/SKILL.md")   # Tier 2: load on match
    return instructions                                    # Tier 3: scripts & refs on demand`,
  explain:[
   {at:'def load_skill',text:'Helper illustrating on-demand skill activation once a user request matches.'},
   {at:'meta = registry[skill_name]',text:'Tier 1 (Discovery): only the compact name and trigger description sit in the base context.'},
   {at:'instructions = read_text',text:'Tier 2 (Activation): read the full SKILL.md steps and edge cases only when the skill is needed.'},
   {at:'return instructions',text:'Tier 3 (Resources): load reference docs or execute sandboxed scripts lazily during execution.'}]},
 {title:'Putting the four pieces together: Prompt, MCP, Skill, Subagent',body:`Each layer has a clear job:
1. System Prompt (always on): core identity, non-negotiable safety rules and general style—keep it lean;
2. Tool / MCP (the hands): atomic access to databases, code repos and external APIs;
3. Agent Skill (the playbook): domain workflows, templates and deterministic scripts loaded on demand;
4. Subagent (isolated worker): separate context window for noisy codebase exploration or parallel sub-tasks, returning only a crisp summary.`},
 {title:'Coding agents: why vector RAG alone falls short',body:`Code relies on exact identifiers, imports, type signatures and call graphs—where embedding similarity often misses exact symbols and goes stale the moment a file is edited.
Effective coding agents combine:
1. File tree & Repo Map: an AST-based skeleton of key files, classes and function signatures for global orientation;
2. Exact search (ripgrep / grep): fast lookup of exact symbols and error strings;
3. Line-ranged reads: inspect only the relevant slice around matches;
4. Spec-driven development: align on a spec or plan before coding, edit step by step, verify with tests and present a clean diff.`},
 {title:'Long-running scaffolds: progress artifacts and Git Worktree',body:`Multi-hour tasks cannot rely on chat history alone to remember what is done. Two patterns keep long runs reliable:
1. External state artifacts: maintain spec.md, checklists or progress.md on disk and update them after each milestone so fresh sessions or post-compaction loops resume cleanly;
2. Git Worktree isolation: when parallel agents or tasks edit the same repository, give each its own git worktree and branch so edits never collide, failed attempts discard cleanly and verified branches merge via diff review.`},
 {title:'Durable workflows & cross-agent collaboration: Checkpoints & A2A',body:`Enterprise tasks often span hours of human waiting or multiple independent agent systems:
1. Durable execution: save state and step progress at checkpoints, interrupt cleanly while waiting hours or days for human approval, and resume idempotently from the exact step when the callback arrives;
2. A2A (Agent2Agent) protocol: while MCP connects an Agent to tools and data, A2A connects independent Agents across frameworks and teams—using Agent Cards for capability discovery, task lifecycle tracking and artifact exchange.`},
 {title:'Hidden risks: Skill supply chain and memory poisoning',body:`Adding Skills and persistent memory expands the attack surface:
1. Skill supply chain: third-party SKILL.md files inject directly into model instructions, and scripts/ run real code—vet sources, pin hashes and sandbox execution with least privilege;
2. Memory poisoning: if untrusted emails or web pages trick an agent into saving malicious rules into long-term memory (“always CC attacker@example.com”), every future session is compromised. Validate write sources, restrict schemas, isolate by user and let users inspect and delete memories;
3. Browser / GUI agents: guard against hidden DOM injections and require confirmation before checkout, posting or auth actions.`},
 {title:'Build to delete: simplifying the harness as models improve',body:`A subtle trap in harness engineering is locking in elaborate 12-step workarounds designed for an older model’s weaknesses. Six months later, a stronger model reasons better on its own, and those rigid crutches slow it down or cause errors.
A healthy harness evolves on two tracks:
1. Keep deterministic safety and verification gates (least privilege, sandboxes, Stop Hooks, budget caps);
2. Whenever you upgrade the base model, benchmark your eval suite with old crutches stripped out and delete what no longer helps, while turning real production failures into new automated gates.`},
];
