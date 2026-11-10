// English edition of the "evals" lesson cards. Same card count and order as the Chinese deck.
import type {AiLesson} from '../journey';

export const evalsEn:AiLesson[]=[
 {title:'Why evaluate: stop changing things by feel',body:`You tweak one sentence of a prompt, try three questions, feel the answers got better, and ship it. That is the most common way to break an AI product, because dozens of other kinds of question you never looked at may have quietly got worse.
An evaluation (an “eval”) is an exam paper for your AI application. Every change sits the same exam, and the score does the talking. It answers three questions: did this change make things better or worse? Is the new model worth switching to? Is yesterday’s production bug really fixed, and will it come back?
Observability is the dashcam for your live system: when something goes wrong, you can see what was happening at the time. This level covers both.`},
 {title:'Building an eval set',body:`An eval set is a list of test questions, each with an expected answer or a scoring rule. A good one contains:
1. Common real questions: ideally picked from what real users asked, covering the main scenarios;
2. Edge cases and questions that are easy to get wrong: very vague ones, very long ones, ones whose answer is simply not in your documents;
3. Bad cases from production: each time you fix one, add it to the set so a later change cannot bring it back.
Thirty to a hundred items are enough to start, and you keep adding. Never fill the set only with questions the model already gets right. The score will look great and reveal nothing.`},
 {title:'Scoring method 1: compare with code',body:`Whenever right and wrong can be decided exactly, score with code. It is fast, precise and free:
Classification: is the model’s category the same as the labelled answer?
Extraction: do the extracted amounts and dates match the labels?
Format: is the output valid JSON with every required field?
Code: does the generated code pass the unit tests?
The most common metric is accuracy: correct answers ÷ total questions. More important than the score, though, is listing the failures and reading each one to see what went wrong.`},
 {title:'Try it: write an eval script',body:`Let’s write the simplest possible eval function. For each item in the eval set it calls a classify function, compares the result with the expected label, computes accuracy and lists the failures. So that it runs without an API key, a few simple rules stand in for the real model call.`,
  code:`dataset = [
    {"text": "My parcel still hasn't arrived after three days", "label": "shipping"},
    {"text": "I want to return this", "label": "after-sales"},
    {"text": "Does this phone support 5G?", "label": "enquiry"},
    {"text": "It arrived broken, how do I exchange it?", "label": "after-sales"},
    {"text": "The delivery is too slow, I want a refund", "label": "after-sales"},
]

def classify(text):
    # simple rules standing in for a real model call
    text = text.lower()
    if "parcel" in text or "delivery" in text:
        return "shipping"
    if "return" in text or "refund" in text or "exchange" in text:
        return "after-sales"
    return "enquiry"

def evaluate(dataset, classify):
    wrong = []
    for item in dataset:
        got = classify(item["text"])
        if got != item["label"]:
            wrong.append({**item, "got": got})
    accuracy = 1 - len(wrong) / len(dataset)
    return accuracy, wrong

acc, wrong = evaluate(dataset, classify)
print(f"Accuracy: {acc:.0%}")
for w in wrong:
    print("Wrong:", w["text"], "| expected", w["label"], "| got", w["got"])`,
  explain:[
   {at:'dataset = [',to:']',text:'The eval set: five customer messages, each labelled with the category we expect. The last one mentions both delivery and a refund. It is a deliberate edge case.'},
   {at:'def classify(text):',to:'return "enquiry"',text:'The classifier. A real project would call a model here; we use keyword rules instead. lower() makes the match ignore capital letters. Notice the order of the rules: delivery is checked first, so the last message will be classified wrongly.'},
   {at:'def evaluate(dataset, classify):',text:'The eval function. It receives the eval set and the classifier to be tested, so you can swap in a different classifier and reuse it unchanged.'},
   {at:'wrong = []',to:'wrong.append(',text:'Call the classifier on each item and record every result that differs from the expected label. {**item, "got": got} means: copy this item and add the actual result to it.'},
   {at:'accuracy = 1 - len(wrong)',to:'return accuracy, wrong',text:'Accuracy = 1 − failures ÷ total. The failures are returned as well, so each can be examined.'},
   {at:'acc, wrong = evaluate(',to:'print("Wrong:"',text:'Run the eval and print the outcome. {acc:.0%} shows the number as a percentage with no decimals. Then each failure is listed with its text, expected category and actual category.'}],
  practice:{steps:['Check that Python 3 is installed (run python --version in a terminal).','Create a file called evaluate.py and paste in the code below.','Run python evaluate.py and look at the accuracy and the one failure.','Think about it: how would you change the rules in classify so that this item is handled correctly? Change them and run it again.'],expect:`Accuracy: 80%
Wrong: The delivery is too slow, I want a refund | expected after-sales | got shipping`}},
 {title:'Scoring method 2: let a model be the judge',body:`Open-ended answers (a summary, a reply to a question, marketing copy) cannot be marked right or wrong by code. You can ask another model to act as the judge and score them against a rubric. This is called LLM-as-judge.
It is convenient, but a judge model has biases too. Three are common:
1. Length bias: it tends to reward longer answers that look more “thorough”;
2. Position bias: when comparing two answers it favours the one shown first (or the one shown last);
3. Self-preference: it favours answers written by models from its own family.
To reduce them: write a clear rubric (state, for example, that being concise is one of the requirements); when comparing two answers, judge twice with the order swapped; and regularly have people score a sample and compare their scores with the judge’s. Never assume the judge’s score is always objective and accurate.`},
 {title:'Old version vs new: how many fixed, how many broken',body:`When you compare two versions, the total score alone hides information. A rise from 80 to 82 might mean five questions fixed and three broken. Those three are called regressions, and they often deserve more attention than the fixes.
So compare question by question. Run the old and new versions on the same eval set, record right or wrong for each question, then pick out “wrong before, right now” (fixed) and “right before, wrong now” (broken).
The function below does exactly that. old and new record whether each question was answered correctly in each version. Running it prints: fixed ['q2', 'q4'], broken ['q3'], net change 1.`,
  code:`def compare(old, new):
    fixed = [q for q in new if new[q] and not old[q]]
    broken = [q for q in new if old[q] and not new[q]]
    return fixed, broken, len(fixed) - len(broken)

old = {"q1": True, "q2": False, "q3": True, "q4": False}
new = {"q1": True, "q2": True, "q3": False, "q4": True}
fixed, broken, net = compare(old, new)
print("Fixed:", fixed)
print("Broken:", broken)
print("Net change:", net)`,
  explain:[
   {at:'def compare(old, new):',text:'Takes two dictionaries: question id → whether that version answered it correctly.'},
   {at:'fixed = [q for q in new',text:'Questions the new version gets right and the old one got wrong. These are “fixed”.'},
   {at:'broken = [q for q in new',text:'Questions the old version got right and the new one gets wrong. These are “broken” (regressions).'},
   {at:'return fixed, broken',text:'Return both lists and the net change (number fixed minus number broken).'},
   {at:'old = {',to:'new = {',text:'How the two versions did on four questions: the new version fixed q2 and q4, but now gets q3 wrong.'},
   {at:'fixed, broken, net = compare(',to:'print("Net change:"',text:'Run the comparison and print the result. Even when the net change is positive, go and find out why q3 broke.'}]},
 {title:'The judge prefers the new version, but users are less happy?',body:`This has really happened. A model judge compared the old and new prompt, the new one won 70% of the time, so it shipped. A week later complaints had gone up. Possible reasons:
1. The judge prefers longer answers, and the new version happened to be longer and wordier, which users found tiresome;
2. The eval questions were made up by engineers and look very different from how real users ask;
3. Only the win rate was checked. Hard metrics such as format errors and a rise in refusals were not;
4. The sample was too small, and 70% may have been luck.
What to do: put conciseness into the rubric; judge in both orders; sample the eval set from real production logs; watch the hard metrics alongside; and finish with a small-traffic online experiment to see how real users react.`},
 {title:'Observability in production: fitting a dashcam',body:`A user says “the AI got it wrong just now”, and you have no idea what it received or what it retrieved. You cannot investigate. So record, for every call: which prompt version and which model were used, the input and output (with personal data masked first), how many tokens and how much time it took, which tools were called, and whether any error occurred.
A single user request usually contains several steps: rewrite the question, retrieve, call the model, call a tool, call the model again. A trace gives the request an id and strings together the input, output and duration of every step, much like the tracking history of a parcel. When something goes wrong, you follow the trail and see which step failed.`},
 {title:'Which metrics to watch after launch',body:`1. Success and error rates: how many requests failed (timeouts, rate limits, malformed output);
2. Latency: look at P50 and P95. P50 means half of all requests were faster than this, so it shows the typical experience. P95 means 95% were faster, so it exposes the few very slow cases;
3. Cost: tokens and spend per request, which quickly reveals a prompt that has grown or a loop that keeps calling the model;
4. User feedback: the share of thumbs up, thumbs down and “regenerate” clicks is the most direct signal of quality.
Set alerts on the key metrics, so you are told at once when the error rate jumps or the spend doubles. And make sure you can break the numbers down by model and by prompt version.`},
 {title:'How to spot hallucinations',body:`A hallucination is the model stating, with a straight face, something that is not true. After launch you can detect and monitor it like this:
1. Check citations: does the cited source really exist, and does it actually support the claim?
2. Compare key facts by program: check the numbers, dates and names in the answer against the database or the source documents;
3. Sample several times and look at consistency: if the same question gets very different answers, the model itself is unsure;
4. Thumbs down and human spot checks: for high-risk answers, in medicine or finance for example, have people review a sample regularly.
Remember that no complaints does not mean no hallucinations. Users never notice many of the errors. Every case you do find belongs in the eval set.`},
 {title:'How to evaluate an agent',body:`An agent takes many steps, so evaluating it means looking at two things:
1. The outcome: was the task actually completed? Check by program wherever you can, for example whether the tests pass or the database is in the right state. Do not rely on the agent’s final message saying “done”;
2. The process (the trajectory): did it choose the right tools and fill in the right arguments? Did it take a detour with unnecessary steps? Did it reach for anything it was not allowed to touch?
Also, an agent may take a different path on every run. Run the same task several times to see whether the success rate holds steady, and record steps, time and cost. The test environment must be resettable with one command, and dangerous actions should run in a simulated environment.`},
 {title:'Online A/B tests: let real users vote',body:`However good the offline evals look, what finally counts is how real users respond. An A/B test splits users at random into two groups: group A gets the old version, group B the new one, and you compare how the two groups do.
Key points:
1. Split by user, not by request. The same person should always see the same version. Only then is the experience consistent, and only then can you compare metrics such as retention;
2. Choose the metrics well: target metrics show the effect (the share of answers accepted, the regenerate rate, the task completion rate); guardrail metrics show side effects (latency, cost, complaints, safety blocks);
3. Run it long enough on enough users. Estimate in advance how many users and how many days you need. Heavy use of the new version in the first two days may only mean people find it new and interesting (the novelty effect). Do not roll out to everyone on the strength of early results.`},
 {title:'Offline score went up, but nothing changed online?',body:`You improved RAG retrieval and the offline eval rose from 72 to 81. Yet after a two-week online test, user satisfaction and the rate of handover to human agents had not moved. Lines of enquiry:
1. The eval set does not represent real traffic: the questions that improved may be ones hardly anyone asks in production;
2. The metric is aimed at the wrong thing: the eval measures whether retrieval is accurate, while users may be unhappy for other reasons, such as answers that are too long, too slow or wrong in tone;
3. The real bottleneck is elsewhere: retrieval is now accurate, but generation does not make good use of the material, or the questions fall outside the knowledge base altogether;
4. The experiment itself: is the sample big enough, is the split correct, should the results be broken down by question type?
The conclusion: offline evals and online experiments have to confirm each other, and the eval set must keep being topped up from real production logs.`},
];
