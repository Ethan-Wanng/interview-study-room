// English edition of the "model-internals" lesson cards (cards 11–20). See model-internals-a.ts.
import type {AiLesson} from '../journey';

export const modelInternalsB:AiLesson[]=[
 {title:'Try it: how big is a KV cache?',body:`Let’s turn the formula from the previous card into a function, then work out how much GPU memory the KV cache needs for a 32-layer model handling 8,192 tokens, comparing GQA with MHA.`,
  code:`def kv_cache_gb(layers, kv_heads, head_dim, seq_len, bytes_per_elem=2):
    total = 2 * layers * kv_heads * head_dim * seq_len * bytes_per_elem
    return total / 1024 ** 3

seq_len = 8192
print(f"GQA (8 KV heads): {kv_cache_gb(32, 8, 128, seq_len):.2f} GB")
print(f"MHA (32 KV heads): {kv_cache_gb(32, 32, 128, seq_len):.2f} GB")`,
  explain:[
   {at:'def kv_cache_gb(',text:'Define the function. It takes the number of layers, the number of KV heads, the dimension of each head, the sequence length, and how many bytes each number uses (2 for FP16 half precision, which is the default).'},
   {at:'total = 2 * layers',text:'Total bytes, straight from the formula. The leading 2 is there because Keys and Values are each stored once.'},
   {at:'return total / 1024 ** 3',text:'Divide by 1024 cubed to convert bytes into gigabytes.'},
   {at:'seq_len = 8192',text:'Assume a single request with 8,192 tokens.'},
   {at:'print(f"GQA',to:'print(f"MHA',text:'Same 32 layers and 128 dimensions per head. GQA with 8 KV heads needs 1 GB; MHA with 32 needs 4 GB, exactly four times as much. And that is one request. Serve 20 users at once and you multiply by 20.'}],
  practice:{steps:['Check that Python 3 is installed (run python --version in a terminal).','Create a file called kv.py and paste in the code below.','Run python kv.py.','Change seq_len to 32768 (about 32 thousand tokens) and run it again to see how the memory grows.'],expect:`GQA (8 KV heads): 1.00 GB
MHA (32 KV heads): 4.00 GB`}},
 {title:'MoE: a big team of experts, only a few called in each time',body:`A mixture-of-experts (MoE) model contains many “expert” sub-networks, for example 64. For each incoming token, a small network called the router picks the two best-suited experts to handle it. The others sit that step out.
The benefit: total parameters can be enormous (lots of knowledge), yet each token only touches a small share of them, so the computation is close to that of a small model. Strong and fast at once.
The catch: although only a few experts work on each token, all of them must stay loaded in GPU memory, ready to be called. MoE saves computation. It does not save memory.`},
 {title:'The three stages of training',body:`A chat model usually goes through three stages of training:
1. Pre-training: practising “guess the next word” on a vast amount of text, over and over. This is where it picks up language and a great deal of world knowledge. At this point it is like someone who has read a library but cannot hold a conversation; ask it a question and it may simply keep writing the question;
2. Instruction tuning (SFT, supervised fine-tuning): more training on many “instruction → good answer” examples, so it learns to understand a request and respond to it;
3. Alignment: making its answers match what people actually prefer, so they are more useful and safer. A common method is RLHF (reinforcement learning from human feedback): people compare two answers, say which is better, and those preferences are used for training. Simpler methods such as DPO do a similar job.`},
 {title:'Sampling: temperature and top-p',body:`At each step the model gives every candidate token a raw score (called a logit), and softmax turns those scores into probabilities. What happens next is decided by the sampling settings:
Temperature: every score is divided by the temperature before the probabilities are computed. Below 1, the gap between high and low scores widens, and the model plays safe, nearly always choosing the most likely token. Above 1, the gap flattens, and the output becomes more varied and creative. At 0 it essentially always picks the top candidate;
Top-p (nucleus sampling): sort the candidates from most to least likely, keep only the smallest group whose probabilities add up to p, and choose from that group. With top-p = 0.9 the model chooses among the candidates that together cover 90% of the probability, which cuts off the long tail of very unlikely, odd words.
Both control randomness. In practice you adjust one of them and leave the other alone.`},
 {title:'Try it: see what temperature does to the numbers',body:`We will write softmax with a temperature in Python. Feed in the raw scores of three candidate words and watch the probabilities go from concentrated to spread out as the temperature moves from 0.5 to 2.`,
  code:`import math

def softmax(logits, temperature=1.0):
    scaled = [x / temperature for x in logits]
    m = max(scaled)
    exps = [math.exp(x - m) for x in scaled]
    total = sum(exps)
    return [e / total for e in exps]

logits = [2.0, 1.0, 0.1]   # raw scores of three candidate tokens
for t in [1, 0.5, 2]:
    probs = softmax(logits, t)
    print(f"T={t}:", " ".join(f"{p:.3f}" for p in probs))`,
  explain:[
   {at:'import math',text:'Load Python’s built-in math library. We need its exponential function, exp.'},
   {at:'def softmax(logits, temperature=1.0):',text:'Define softmax with a temperature. It takes a list of raw scores and a temperature, and returns the probability of each candidate.'},
   {at:'scaled = [x / temperature',text:'Divide every score by the temperature first. The lower the temperature, the more the differences between scores are stretched.'},
   {at:'m = max(scaled)',to:'exps = [math.exp(x - m)',text:'Raise e to the power of each score. Subtracting the largest score first is a standard trick to avoid overflow, and it does not change the final result.'},
   {at:'total = sum(exps)',to:'return [e / total',text:'Divide each number by the total, which gives probabilities that add up to 1.'},
   {at:'logits = [2.0, 1.0, 0.1]',text:'Raw scores for three candidate tokens. The first is the highest.'},
   {at:'for t in [1, 0.5, 2]:',to:'print(f"T={t}:"',text:'Compute and print the probabilities at temperatures 1, 0.5 and 2, to three decimal places. At 0.5 the first candidate takes 86%; at 2 it drops to 50%. The distribution is visibly flatter.'}],
  practice:{steps:['Check that Python 3 is installed (run python --version in a terminal).','Create a file called temp.py and paste in the code below (it only uses the built-in math module, so there is nothing to install).','Run python temp.py and compare the first candidate’s probability at the three temperatures.'],expect:`T=1: 0.659 0.242 0.099
T=0.5: 0.864 0.117 0.019
T=2: 0.502 0.304 0.194`}},
 {title:'Why results still change at temperature 0',body:`Many people assume that setting temperature to 0 guarantees the same output for the same input. Not quite:
1. To be efficient, providers bundle many users’ requests together (batching). Floating-point arithmetic on a GPU can run in a slightly different order each time, and that can be enough to swap two candidates whose probabilities are almost equal;
2. The provider may quietly update the model behind the same name.
If the business needs stable, auditable results (ticket classification, for example), do this:
Pin a model name that includes a specific version; use structured output so the category can only come from a fixed list; store the result the first time a ticket is classified and look it up afterwards instead of calling the model again; and for results that really matter, call several times and take the majority, or send them to rules and human review.`},
 {title:'Advanced prompting techniques',body:`1. Chain of thought (CoT): ask the model to reason step by step before giving its answer. Results improve clearly on maths, logic and other multi-step problems. It is no cure-all, though. Simple tasks do not need it, and the reasoning is made of output tokens too, so it adds cost and waiting time;
2. Prompt chaining: split a complex task into several calls, where each step’s output feeds the next. For example: extract the key points → write a summary from them → check the summary. Each step is simpler, and it is easier to see which one went wrong;
3. Self-check: have the model review its own answer against the requirements;
4. XML tags for long prompts: wrap the parts in tags such as <documents>, <instructions> and <examples>, so the model is less likely to mix them up.`},
 {title:'Self-consistency and reasoning models',body:`Self-consistency: have the model solve the same problem several times independently (its reasoning differs each time) and keep the answer that appears most often. It is like several people working a sum separately and then voting. Occasional slips get outvoted, so accuracy rises. The cost is that calls and spend multiply, so use it only where the stakes are high.
Reasoning models (also called “thinking” or “extended thinking” mode): the model thinks at length internally before answering. They shine on maths, difficult code changes and multi-step planning. For simple classification, rewriting or small talk they are slow and expensive with little gain. Decide per task whether to switch it on.`},
 {title:'Two traps with long prompts: the lost middle and a slow first token',body:`Someone pastes an entire 80-page contract into the prompt and asks questions about it. Two problems appear:
1. Clauses in the middle pages are often ignored. Research shows models are most sensitive to the beginning and end of a long text and most likely to miss what sits in the middle. This is known as “lost in the middle”;
2. The first token takes several seconds, because the model must read tens of thousands of tokens before it can start to answer.
What to do: use RAG to put in only the few passages relevant to the question instead of the whole document; place the most important instructions and material at the start or the end; and when the same contract will be queried many times, put it at the very front of the prompt so prompt caching can cut both cost and time to first token.`},
 {title:'Cheat sheet: every acronym in this level',body:`This level has a lot of acronyms. Here they are in order of appearance, one line each. Come back whenever you forget one, or ask the AI tutor.
Transformer: the standard design of today’s large models, a stack of dozens of layers, each with self-attention and a feed-forward network;
FFN (feed-forward network): the part of each layer that processes every token on its own; much knowledge is stored here;
Query, Key, Value: each token’s three vectors in self-attention: what I am looking for, what I can offer, and my actual content;
RoPE (rotary positional embedding): uses rotation angles to tell the model how far apart two words are;
KV cache: stores Keys and Values already computed so they are not recomputed; faster generation, more GPU memory;
MHA, MQA, GQA: multi-head attention and its two memory-saving variants. MQA shares one set of Keys and Values across all heads; GQA shares within groups, as a compromise;
MoE (mixture of experts): many expert sub-networks with only a few used per token; saves computation, not memory;
SFT (supervised fine-tuning): teaches the model to follow instructions using “instruction → good answer” examples;
RLHF, DPO: further training on human preferences (which answer is better) to make answers more useful and safer;
logits, softmax: the raw score the model gives each candidate token, and the function that turns scores into probabilities;
temperature, top-p: two settings that control how random the choice of the next token is;
CoT (chain of thought): have the model reason step by step before answering;
self-consistency: solve the same problem several times and keep the most common answer.
If you can explain each line in your own words, the quiz for this level will not be hard.`},
];
