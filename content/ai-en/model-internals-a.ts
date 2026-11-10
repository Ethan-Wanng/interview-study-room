// English edition of the "model-internals" lesson cards (cards 1–10). Written for English readers rather than translated line by line,
// but the card count and order match the Chinese deck so that "card N" links work in both languages.
import type {AiLesson} from '../journey';

export const modelInternalsA:AiLesson[]=[
 {title:'From “using it” to “how it works”: how to study this stage',body:`So far you have learned how to use a model well: retrieval, engineering, cost trade-offs. The Advanced stage changes the angle. We open the hood and look at what happens inside.
That means a burst of new terms and acronyms in this level. That is expected, and there is no need to panic. They fall into just five groups, each answering one question:
1. How the model is built: Transformer, self-attention, positional encoding (how does it “read” a sentence?);
2. Saving GPU memory: KV cache, MQA, GQA, MoE (why are long chats expensive, and how do we cut the bill?);
3. How the model was trained: pre-training, SFT, RLHF (why can it chat, and why does it follow instructions?);
4. Picking the next word: temperature, top-p (why does the same question get different answers?);
5. Stronger prompting: chain of thought, self-consistency, reasoning models.
How to study: for each card, aim to say in one plain sentence what the term is for. You do not need to derive any formula. The cards build on each other, so if one does not click, ask the AI tutor (bottom right) before moving on. The last card is a cheat sheet of every acronym in this level.`},
 {title:'Four words to know first: parameters, training, inference, GPU memory',body:`Four words come up again and again in the next cards. Here they are in plain English.
Parameters: the huge pile of numbers stored inside a model, from a few billion to hundreds of billions. Everything the model “knows” lives in those numbers. Picture a radio with billions of tiny dials; the position of each dial is one parameter. A “7B model” has 7 billion of them.
Training: the process of turning those dials. The model is shown enormous amounts of text and asked to guess the next word; each wrong guess nudges the dials a little in the right direction. This takes many GPUs and weeks or months. Think of it as the model going to school.
Inference: once training ends, the dials stop moving and the model is put to work answering questions. Every API call and every chat message is inference. Think of it as the model going to work.
GPU memory (VRAM): the memory on a graphics card. All the parameters must be loaded into it before the model can run, and the temporary data produced while it runs lives there too. It is limited, and running out means a crash. Many techniques in this level exist only to save GPU memory.
One sentence to keep: training puts knowledge into the parameters, inference uses the parameters to compute an answer, and both happen on GPUs.`},
 {title:'A model does exactly one thing: guess the next token',body:`However clever a large model looks, each step does one thing only: given all the text so far, predict which token is most likely to come next.
Suppose the text so far is “The weather today is”. The model gives every candidate a probability, say “nice” 70%, “hot” 20%, “awful” 8%, and so on. It picks one, appends it, then feeds the longer sentence back in to predict the next one. One token after another until the answer is finished. This “write one, append, write the next” loop is called autoregressive generation.
One more important fact: the parameters are frozen once training ends. Chatting with a model does not teach it anything. Open a new conversation tomorrow and it will not remember what you said today.`},
 {title:'Two old friends: tokens and vectors',body:`Before we look at the Transformer, a quick recap of two terms from earlier levels. Every card from here on uses them.
Token: the smallest unit of text a model handles (level 1). A sentence is first cut into tokens, roughly “a word or a piece of a word”. Tokens are what the model reads, what it writes, and what you are billed for.
Vector: a list of numbers (the vector database level), such as [0.2, -1.3, 0.8, …]. A model cannot read letters; it can only do arithmetic. So every token is turned into a vector the moment it enters the model. Words with similar meanings get similar vectors.
Dimension: how many numbers are in one vector. In a large model a token’s vector usually has several thousand numbers. More dimensions leave room for finer detail.
So here is the picture to hold on to: a sentence comes in and becomes a row of vectors, one per token; that row is processed layer after layer; finally the processed vectors are used to compute which token is most likely next. The Transformer, on the next card, is the part that does the processing.`},
 {title:'The Transformer: a stack of “reading groups”',body:`Almost every large model today is built on a design called the Transformer. Picture dozens of reading groups stacked on top of each other. Text is cut into tokens and turned into vectors, then passed up the stack. Each layer understands the text a little better than the one below, and the top layer outputs the probability of each possible next token.
Each layer has two main parts:
1. Self-attention lets every token look at the other tokens around it and work out how they relate (the card after next goes deeper);
2. A feed-forward network (FFN) then processes each token on its own. A lot of the model’s factual knowledge is stored here.
Each layer also has two small parts that keep the signal steady on its way up: residual connections and layer normalization. The next card covers them.`},
 {title:'Residual connections and layer norm: nothing lost, nothing out of range',body:`A large model has dozens of layers, and the row of vectors has to travel from the first to the last. Two things can go wrong on such a long trip, so every layer carries two small fixes.
Problem one: the original information fades away. It is like the telephone game, where a message passed through thirty people comes out unrecognisable.
A residual connection adds the layer’s untouched input back onto its output. It is as if each player also passed along the original note on paper. Even if one layer does a poor job, the original information survives.
Problem two: the numbers drift, growing huge or shrinking to almost nothing, and later layers cannot work with them. Imagine a meeting where some people keep getting louder and others keep getting quieter until nobody can follow.
Layer normalization rescales the numbers to a sensible range at every layer, like resetting everyone’s volume each round. That is what makes it possible to train models with dozens or hundreds of layers.
In interviews these two usually come up together with the Transformer. It is enough to say: residual connections stop information from being lost in a deep network, and layer normalization keeps the values stable so training is easier.`},
 {title:'Self-attention: every word looks at the others',body:`Read this sentence: “The cat didn’t eat the fish because it wasn’t hungry.” You know at once that “it” means the cat. A model works this out with self-attention. While processing the token “it”, it looks at every other token in the sentence, decides how much attention each one deserves, finds that “cat” matters most, and blends more of the cat’s information into “it”.
In practice each token gets three vectors: a Query (what am I looking for?), a Key (what can I offer?) and a Value (my actual content). One token’s Query is compared with every other token’s Key to get an attention weight, and the Values are then added up according to those weights.
Because every token can look directly at every other token, even words far apart can be connected. That is the main reason the Transformer beat earlier designs. The price is that the work grows with the square of the length: twice the text means roughly four times the computation.`},
 {title:'Positional encoding and RoPE: telling the model about word order',body:`Self-attention has a blind spot. It sees which tokens relate to which, but it has no built-in sense of order. “Dog bites man” and “man bites dog” would look much the same to it.
So each token is given extra information about where it sits in the sequence. This is called positional encoding.
Many current models use RoPE (rotary positional embedding). Each token’s vector is rotated by an angle that depends on its position. When two tokens are compared, the difference between their angles reflects how far apart they are, so the model naturally knows whether two words are close or distant (relative position). A further benefit is that RoPE can be stretched, with a few tricks, to texts longer than anything seen in training.`},
 {title:'The KV cache: why long chats eat GPU memory',body:`A model writes one token at a time. To write token 100 it needs the Keys and Values of the 99 tokens before it; for token 101 it needs those of the first 100. Recomputing all of them at every step would be very wasteful.
So during inference the Key and Value of each token are stored once computed and simply reused afterwards. That store is the KV cache. It makes generation much faster, and it pays for that speed with GPU memory: the longer the conversation and the more users served at once, the bigger the cache. This is one of the main reasons long-context services are expensive and GPUs so often run out of memory.
Roughly, the cache size is: 2 (one copy each for K and V) × number of layers × number of KV heads × dimension per head × sequence length × bytes per number.`},
 {title:'MHA, MQA, GQA: slimming down the KV cache',body:`Attention actually runs as many “heads” in parallel, each tracking a different kind of relationship (one follows grammar, another follows who “it” refers to). This is multi-head attention (MHA). In MHA every head keeps its own Keys and Values, so the KV cache is large.
Two variants were invented to save memory:
MQA (multi-query attention): all heads share a single set of Keys and Values. Smallest cache, with some possible loss in quality;
GQA (grouped-query attention): the middle path. Heads are split into groups, and each group shares one set of Keys and Values.
A quick sum: a model has 32 query heads and uses GQA with 8 KV heads. Its KV cache is 8 ÷ 32 = 1/4 the size it would be with MHA. Llama and many other mainstream models use GQA.`},
];
