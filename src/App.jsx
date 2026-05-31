// ─────────────────────────────────────────────────────────────────────────────
// TONIGHT'S CONNECTION — with Auth + Cloud Storage
//
// SETUP INSTRUCTIONS (do these before deploying to Vercel):
//
// 1. Create a FREE Supabase project at supabase.com
//    - Go to Table Editor → New Table → name it "used_questions"
//    - Add these columns:
//        id          (int8, primary key, auto-increment)
//        user_id     (text, not null)
//        category_id (text, not null)
//        question    (text, not null)
//        used_at     (timestamptz, default: now())
//    - In the Table Editor, also add a UNIQUE constraint on (user_id, category_id, question)
//      so upsert works correctly. Go to the table → Indexes → Add index, check "unique".
//    - Go to Settings → API → copy your Project URL and anon/public key
//
// 2. In Vercel, set these Environment Variables (Settings → Environment Variables):
//    VITE_SUPABASE_URL      = your Supabase project URL
//    VITE_SUPABASE_ANON_KEY = your Supabase anon key
//
// 3. Supabase handles ALL auth (sign up, sign in, forgot password) built-in.
//    No Clerk needed — this version uses Supabase Auth directly.
//
// 4. Install packages:  npm install @supabase/supabase-js
//
// 5. Your main.jsx just needs:
//    import App from './App'
//    import ReactDOM from 'react-dom/client'
//    ReactDOM.createRoot(document.getElementById('root')).render(<App />)
//
// HOW COUPLES SHARE AN ACCOUNT:
//    One partner creates the account. Both partners use the same email + password
//    to log in from any device. Their used-question history is shared in the cloud.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const COOLDOWN_DAYS = 180;

// ─── ALL 994 QUESTIONS ────────────────────────────────────────────────────────
const ALL_CATEGORIES = [
  {
    id: "deep", label: "Deep", color: "#fffaf4", accent: "#a07830",
    questions: [
      "What part of you do you rarely share because you're afraid someone won't know what to do with it?",
      "In what ways has love changed the way you see the world, not just people?",
      "If you could sit in silence with someone and still feel deeply understood, what would that moment feel like?",
      "What do you secretly hope your life is teaching others, even if they never say it out loud?",
      "When did you first realize you were more than what you survived?",
      "What's a belief you no longer hold that once felt like your entire truth?",
      "If your soul could leave a note behind every time it grew, what would one of those notes say?",
      "What version of yourself do you mourn the most, even though you've outgrown them?",
      "What do you think your inner child still doesn't fully trust about love?",
      "When have you felt the safest in someone's energy without needing words?",
      "If life whispered a message to you during your quietest moments, what would it say?",
      "What part of you still feels like it's waiting to be chosen?",
      "When did you last feel seen in a way that surprised you?",
      "What truth about you feels too heavy to offer casually?",
      "In what moments do you feel closest to your purpose, even if you can't define it?",
      "If pain could talk, what would yours say it wants to be acknowledged for?",
      "What do you love about your mind that no one else has ever complimented?",
      "What emotion do you hide even from yourself because you don't know where to place it?",
      "What has life taught you about endings that your younger self wouldn't have understood?",
      "What dream have you never said out loud because it feels too sacred to risk?",
      "What have you forgiven that still echoes through your behavior?",
      "When do you feel like your spirit is older than your body?",
      "What's a fear you've never admitted because it feels too tender to name?",
      "What moment from your past do you wish you could watch on film, not to relive it, but to finally understand it?",
      "When have you mistaken being needed for being loved?",
      "What emotion is hardest for you to receive from others, even when it's genuine?",
      "What's a question you wish someone had asked when you were younger but never did?",
      "What part of your healing journey feels invisible to most people?",
      "If your life had a sacred pause button, when would you have pressed it just to feel longer?",
      "What memory holds a version of you that you've never stopped yearning for?",
      "What do you think your energy teaches people before your words even arrive?",
      "What type of love do you think your spirit has always been searching for, even if you couldn't name it?",
      "What have you unlearned about love that felt like a spiritual breakthrough?",
      "What truth do you carry that feels too beautiful to force into words?",
      "What do you think your presence gives people without you even trying?",
      "What are you still making peace with when it comes to how you were raised to receive affection?",
      "If you could show me one invisible part of you without fear, what would you reveal?",
      "What's something you long to be held for, not fixed?",
      "What has your silence protected you from, and what has it cost you?",
      "If your soul had a safe word, what would it be and why?",
      "What piece of wisdom has come from your pain that you wouldn't trade, even if it hurt?",
      "When did you feel loved in a way that had nothing to do with words, touch, or gifts?",
      "What pattern do you keep repeating because part of you still believes it's safer than healing?",
      "What emotion do you feel in your body before you feel it in your heart?",
      "What kind of peace do you think your future self is waiting for you to choose now?",
      "What has love taught you about being still?",
      "What memory would you place in a time capsule, not for nostalgia, but for clarity?",
      "What part of you are you still trying to prove doesn't need protection?",
      "What's one moment in your life that you've never fully told because it feels too sacred to simplify?",
      "If someone could only love you through your deepest silence, would they still know how?",
    ],
  },
  {
    id: "awkward", label: "Awkward, Funny & Random", color: "#fff8f0", accent: "#b8760a",
    questions: [
      "When was your last truly awkward moment and how did you recover from it?",
      "What's one thing that everyone seems to love... but you just don't get the hype?",
      "What's the weirdest dream you've ever had that you still remember?",
      "What old-school sayings do you wish would make a comeback?",
      "What trend did you shamelessly follow as a teenager that now makes you cringe?",
      "What's the silliest fear you have that you know makes no logical sense?",
      "What's on your bucket list that's completely random or unexpected?",
      "What's the most embarrassing thing you've ever done in front of someone you liked?",
      "Have you ever laughed at the wrong moment, what happened?",
      "What's the strangest gift you've ever received or given?",
      "What's a food combination you secretly enjoy that other people would find weird?",
      "What's your most irrational pet peeve?",
      "What's the funniest misunderstanding you've ever had?",
      "What's something you believed as a kid that turned out to be totally false?",
      "What's the most random fact you know by heart, and why do you know it?",
      "If your life had a laugh track, what moment would cue it instantly?",
      "What's something totally weird that always makes you laugh?",
      "If you had to be quarantined with any celebrity, who would you choose and why?",
      "What would be the worst (but hilarious) name for a romantic movie about your life?",
      "What's your go-to karaoke song... and do you actually sing it well?",
      "What's one fashion choice from your past you'd pay money to erase?",
      "What's the most unexpected thing you've ever Googled?",
      "What's your guilty pleasure that's so ridiculous, you almost didn't want to admit it here?",
      "If we were in a zombie apocalypse, what's the one job you should NOT be assigned?",
      "If you had to eat the same meal every day for a month, what would it be, and would you still love it afterward?",
      "When was the last time you laughed so hard that you cried?",
      "If you were going to change your name, what would it be?",
      "Who or what never fails to make you laugh?",
      "What's something that made you literally laugh out loud off guard?",
      "Who would be the worst person to be trapped in an elevator with? The best person?",
    ],
  },
  {
    id: "boundaries", label: "Boundaries, Red Flags & Dealbreakers", color: "#fff5f0", accent: "#b4643c",
    questions: [
      "What would be an absolute dealbreaker for you in a relationship, something you couldn't overlook?",
      "Have you ever witnessed a relationship dynamic that made you think, 'That could never be me'?",
      "Would you ever consider divorce under certain circumstances, or do you believe love can overcome anything?",
      "What are your personal boundaries when it comes to sharing physical or emotional space with others?",
      "How do you feel about couples who share everything vs. those who keep some things private?",
      "What's your honest view on infidelity — emotional, physical, or even digital?",
      "Do you think most people actually recover from cheating, or do they just learn to live with it?",
      "Have you ever seen someone ignore red flags in a relationship and what happened as a result?",
      "How do you feel about having close friendships with the opposite sex while in a committed relationship?",
      "Where do you draw the line between loyalty to me and loyalty to your friends or family?",
      "Is there anything in our relationship you feel hesitant to bring up, even if it's small?",
      "How do you feel about keeping relationship issues private vs. asking others for advice?",
      "When do you think it's okay to bring up something that's been bothering you? Immediately, or after cooling off?",
      "What role does jealousy play in relationships, do you think a little bit is healthy, or a red flag?",
      "Have you ever been in a relationship where someone tried to control you in subtle ways?",
      "What are your thoughts on snooping — going through phones, social media, or emails without permission?",
      "How do you define emotional safety in a relationship?",
      "What's a boundary you wish more people would protect in their relationships?",
      "What's your approach when someone crosses a line with you, do you speak up immediately or reflect first?",
      "Do you believe in setting boundaries with in-laws, and how would you handle it if they overstepped?",
      "Have you ever seen someone stay in a relationship that was clearly draining their energy?",
      "What's your take on 'taking space' in a relationship, healthy boundary or potential red flag?",
      "How do you feel about giving second chances, is it situational or never an option?",
      "What's one thing you would never tolerate in a romantic partnership, no matter how good everything else was?",
      "Have you ever witnessed someone ignore their gut feeling about a partner and what did you learn from it?",
    ],
  },
  {
    id: "causes", label: "Causes & Contribution", color: "#fffaf4", accent: "#9a7828",
    questions: [
      "Is there a charitable cause you support now or would like to in the future?",
      "What type of change in the world would you most love to be part of, even in a small way?",
      "If we had an abundance of money, how would you want to use it to help others?",
      "Is there a community or group of people you feel especially drawn to support or uplift?",
      "Have you ever volunteered before? What kind of impact did it have on you?",
      "What's something you've seen that made you feel, 'I wish I could do more to help'?",
      "Do you believe it's more meaningful to give time, money, or resources and why?",
      "What are your thoughts on anonymous giving versus public support of a cause?",
      "If we created a family tradition of giving back, what would that look like?",
      "Have you ever had a moment where someone's kindness changed your life?",
      "What causes or social issues are closest to your heart, even if you don't talk about them often?",
      "What's one way we could contribute to our local community together this year?",
      "Do you think generosity is something people are born with or something they learn?",
      "What does 'making a difference' mean to you personally?",
      "If you could start a nonprofit or foundation, what would its mission be?",
      "What kind of legacy would you want to leave behind beyond family and finances?",
      "Have you ever had someone go out of their way to help you? How did it impact you?",
      "What kind of global issues do you stay most informed about and why those?",
      "Do you believe every person has a unique role in contributing to the world's healing?",
      "If we mentored a younger couple or individual, what wisdom would you want to pass down?",
      "What are your thoughts on mutual aid, community gardens, or cooperative living models?",
      "Would you rather be a behind-the-scenes helper or a visible leader in a cause you believe in?",
      "What's one way we can be more intentional about how we use our time, energy, or money to help others?",
      "Is there a small act of kindness you once received that stayed with you long after it happened?",
      "What's something we could start doing as a couple that would help us feel more connected to the world around us?",
    ],
  },
  {
    id: "character", label: "Character & Values", color: "#fffbf0", accent: "#a08030",
    questions: [
      "When have your values and morals been compromised?",
      "What do you think makes someone a 'good person'?",
      "How do you show kindness to others?",
      "Which of your personality traits are you most proud of?",
      "What principles do you try to live by, even when no one's watching?",
      "What do you admire most in other people's character?",
      "Have your values changed over time? If so, what influenced that shift?",
      "What's one decision you made in life that you're proud of because it aligned with your values?",
      "Do you think people can be deeply good and still make big mistakes?",
      "What does integrity mean to you in everyday life?",
      "Have you ever had to walk away from something or someone because it didn't align with your values?",
      "How do you personally define humility?",
      "What does loyalty look like in your life outside of romantic relationships?",
      "Do you think people are mostly good, or mostly self-interested?",
      "When do you feel most proud of who you are?",
      "What part of your character have you worked the hardest to grow?",
      "What role does forgiveness play in your life and values?",
      "Is it more important to be honest or kind or do you believe they must go together?",
      "What do you value more in others, courage or compassion?",
      "Who taught you what it means to have strong character?",
      "If you had to pass on just three values to the next generation, what would they be?",
      "What parts of your personality feel shaped by struggle or adversity?",
      "How do you want to be remembered by the people who know you best?",
      "What does being 'real' mean to you?",
      "Do you believe people's values are revealed more by their words or their actions?",
    ],
  },
  {
    id: "childhood", label: "Childhood & Growing Up", color: "#fff8f2", accent: "#986030",
    questions: [
      "Where did you grow up?",
      "What do you miss about being a kid?",
      "What did you think was the most challenging part of being a kid?",
      "What was your favorite cartoon when you were a kid?",
      "What was your favorite board game when you were a kid?",
      "What was your favorite video or arcade game when you were a kid?",
      "What is your earliest memory?",
      "What's your best childhood memory?",
      "What's your worst childhood memory?",
      "What's your best high school memory?",
      "What's your worst high school memory?",
      "When you were a kid what type of candy did you like the most? What type did you hate?",
      "What was your personality like as a kid?",
      "Who were your childhood role models or heroes?",
      "What was your favorite toy or activity growing up?",
      "Did you have a childhood nickname? If so, what was it?",
      "What's something you believed as a child that you now find hilarious?",
      "What kind of student were you in school?",
      "Did you have a favorite teacher who made a lasting impact?",
      "What did you want to be when you grew up?",
      "What was your biggest fear as a kid?",
      "What kind of home did you grow up in — loud, quiet, strict, fun?",
      "Did you get in trouble a lot, or were you pretty well-behaved?",
      "What shows or cartoons did you love as a kid?",
      "What was your favorite meal or snack growing up?",
      "Did you have any special childhood traditions?",
      "How did your family celebrate holidays or birthdays?",
      "Were you more of a loner or always surrounded by friends?",
      "What was your very first job, chore, or way of earning money?",
      "What music reminds you of your childhood?",
      "How has your childhood shaped the way you love today?",
      "If you could go back and tell your younger self one thing, what would it be?",
      "What's one thing from your childhood you wish more people understood about you?",
    ],
  },
  {
    id: "communication", label: "Communication & Conflict", color: "#fffaf2", accent: "#8a7030",
    questions: [
      "Do our differences complement each other?",
      "What are your thoughts on couples counseling prior to getting engaged?",
      "Would you be willing to go to marriage counseling if we were having marital problems or even if we just wanted to build our marriage?",
      "How do you handle disagreements in general?",
      "Would you rather discuss issues as they arise or wait until you have a few problems?",
      "How would you communicate if you aren't satisfied sexually?",
      "What is the best way to handle disagreements in a marriage if we're both feeling angry?",
      "How can I be better at communicating with you?",
      "What is the best way I can be a supportive partner to you?",
      "How can I make you feel more appreciated and honored?",
      "What do you think would improve our relationship?",
      "What would be one thing you would change about our relationship?",
      "Do you have any doubts about the future of our relationship?",
      "Do you feel heard when we talk about difficult things?",
      "When you're upset, what do you most need from me?",
      "What's your natural conflict style — fight, flight, freeze, or fix?",
      "What tone or approach shuts you down in conversation?",
      "What helps you feel safe enough to be honest with me?",
      "How do you prefer to cool off after an argument — space, touch, or talking it out?",
      "What's something I say or do during conflict that feels loving, even when we disagree?",
      "How do we usually repair after a disagreement and is there anything we could do better?",
      "What are your thoughts on silent treatments, helpful or harmful?",
      "What's one thing I could do that would make you feel more emotionally secure in our relationship?",
      "What's your love language during conflict, what speaks most deeply to you when things feel tense?",
    ],
  },
  {
    id: "compatibility", label: "Compatibility & Readiness", color: "#fffaf4", accent: "#9a7830",
    questions: [
      "What do you think people need to know about each other before they get married or move in together?",
      "In what ways do you feel we're deeply compatible?",
      "Are there any lifestyle differences between us that we've learned to embrace?",
      "What are some ways we've grown more aligned over time?",
      "What do you admire most about the way I approach life?",
      "How do we balance our independence with our connection?",
      "What parts of our relationship feel effortless and what takes intentional effort?",
      "How do our daily routines complement or clash with each other?",
      "What role does personal growth play in our relationship?",
      "Do you feel like we're on the same page when it comes to long-term goals?",
      "What do you think makes our relationship work?",
      "How have we adjusted to each other's habits or quirks over time?",
      "How do you think we've changed each other for the better?",
      "What do you love about the way we spend time together?",
      "Is there an area of our relationship where we've really learned how to 'read' each other?",
      "What's something you feel we've mastered as a couple?",
      "What would you say is our 'secret sauce'?",
      "In what ways are we a great team?",
      "When did you first feel like we were really in sync?",
      "What are some small ways we've built compatibility without even realizing it?",
      "Do you think we bring out the best in each other?",
      "What areas are we still growing in and how can we support each other through that?",
      "What surprised you most (in a good way) about living life with me?",
      "What's something about our relationship that feels rare or special to you?",
      "What part of our connection feels timeless, like it would work no matter where or when we met?",
    ],
  },
  {
    id: "entertainment", label: "Entertainment, Music & Mood", color: "#fffcf0", accent: "#a88828",
    questions: [
      "What's on your music playlist(s)?",
      "What song(s) can put you in a good mood no matter what?",
      "What song always gets you out on the dance floor?",
      "What's your 'dance like nobody's watching' song?",
      "What song(s) make you cry?",
      "What song reminds you of us?",
      "If you/your life had a theme song, what would it be?",
      "What's your go-to karaoke song?",
      "What book(s) have made a positive impact on your life?",
      "Who was your celebrity crush as a teenager?",
      "What movie have you watched more than five times — and still love?",
      "What show do you think we should binge together next?",
      "What's your favorite feel-good movie or series?",
      "Which fictional character do you relate to the most?",
      "If you could step into any movie world for a day, where would you go?",
      "What's a movie or show that surprised you by how much you loved it?",
      "What's your favorite line from a movie or show?",
      "What's your favorite book of all time?",
      "What instrument would you like to play?",
    ],
  },
  {
    id: "family", label: "Family Relationships & Parenting", color: "#fff8f2", accent: "#906030",
    questions: [
      "What are some family traditions you grew up with that you'd love to start implementing?",
      "What family traditions would you want to leave behind?",
      "What's one thing you admire about how your parents handled their relationship?",
      "What's something you wish your parents had done differently in their relationship?",
      "How do you feel about boundaries with family?",
      "Who in your family do you feel closest to and why?",
      "What was your childhood home environment like?",
      "Have you ever felt pressure from your family about your life choices?",
      "Have your views about family changed as you've gotten older?",
      "Do you believe in cutting ties with toxic family members?",
      "What's a fond memory you have with your family growing up?",
      "How has your relationship with your siblings evolved over the years?",
      "What qualities do you think are important in being a good son or daughter?",
      "What does 'family' mean to you beyond blood relatives?",
      "What kind of grandparent do you want to be someday?",
      "What makes a parent a 'good parent'?",
      "What do you believe it takes to raise good kids who thrive in society?",
      "What would you do if one of our kids said they were questioning their gender or sexuality?",
      "How much say do you believe children should have in a family?",
      "Homeschool or public school, which is better?",
      "What do you value most about your family?",
      "What do you believe it takes for blended families to be successful?",
      "How has your opinion of your family changed over the years?",
      "If you could spend an entire day with a family member, who would it be and what would you do?",
      "Which family member has had the greatest impact on you?",
      "If you could change your relationship with a family member, would you? If so, with whom?",
      "What's your favorite story about your grandparents?",
      "What's your favorite family memory?",
      "Do you ever wish you were raised differently?",
      "What's the best piece of advice a family member has given you?",
      "Did you ever hide anything from or lie to your parents?",
      "What's your favorite way to spend time with your family?",
      "What are your favorite family traditions?",
      "What family traditions would you like to create of your own?",
      "What's something your family would be surprised to learn about you?",
      "Which family member do you confide in most?",
      "How do you deal with arguments between family members?",
      "What makes you proud of your family?",
      "What can always bring your family together?",
      "What activities did you love to do with your family growing up?",
      "Would you rather go back in time to meet your ancestors, or travel into the future to meet your descendants?",
    ],
  },
  {
    id: "friendships", label: "Friendships & Social Circle", color: "#fff5f0", accent: "#a05030",
    questions: [
      "How would your close friends describe you?",
      "Do you get along with all your coworkers?",
      "How would your co-workers describe you?",
      "How do you determine who your real friends are?",
      "What's the longest friendship you currently have?",
      "Have you ever broken up with a friend? If so, why?",
      "What do you value most about your friendships?",
      "Who do you wish you had a better relationship with?",
      "What do you believe makes you an asset to your family, friends, and co-workers?",
      "Who causes the most drama in your family?",
      "Who causes the most drama in your friends' group?",
      "Do you believe friends can become chosen family?",
      "Who do you turn to when you need unbiased advice?",
      "What qualities do you admire most in your closest friend?",
      "Have your friendships changed as your life has changed?",
      "Do you think it's harder or easier to make friends as an adult?",
      "What's something a friend has done for you that you'll never forget?",
      "Have you ever felt jealous or left out in a friendship? How did you handle it?",
      "Are you the initiator in your friendships or more of a go-with-the-flow type?",
      "Who in your circle pushes you to be better without making you feel judged?",
      "Do you believe all friendships are meant to last forever?",
      "What do you think is the secret to long-lasting friendships?",
      "Do you feel like you're currently missing a certain type of friend in your life?",
      "Have you ever had a falling out with someone and reconnected later?",
      "Do you believe couples should have shared friends or keep friend groups separate?",
    ],
  },
  {
    id: "goals", label: "Goals, Ambition & Purpose", color: "#fffaf4", accent: "#d9b06a",
    questions: [
      "What are your career goals?",
      "What would you like to accomplish in the next 6 months?",
      "Where do you see yourself in 3 years?",
      "When would you like to retire and what do you plan to do after retirement?",
      "Where do you see yourself living when you retire?",
      "What are you the most passionate about?",
      "What do you believe your purpose in life is?",
      "What dreams do you have for yourself/your life?",
      "What motivates you to keep going on hard days?",
      "Have your goals changed over the years? If so, how?",
      "What legacy would you love to leave behind?",
      "What does 'success' look like to you?",
      "What do you need more of in order to reach your full potential?",
      "Is there anything you've always wanted to pursue but haven't yet?",
      "Do you ever feel like you're playing small?",
      "What personal milestone are you most proud of so far?",
      "What's something you want to try even if you might fail?",
      "What role does money play in how you define success?",
      "How do you stay focused on your goals when life gets busy?",
      "Do you set yearly goals, vision boards, or intentions?",
      "What helps you stay in alignment with your values while pursuing your dreams?",
      "What's one big goal we could work toward together?",
      "Do you ever feel pressure to 'have it all figured out'?",
      "How do you celebrate your wins — big or small?",
      "How do you handle setbacks or feeling behind in life?",
      "What personal passion project are you working on right now?",
    ],
  },
  {
    id: "habits", label: "Habits, Quirks & Self-Awareness", color: "#fffbf2", accent: "#a07828",
    questions: [
      "What bad habits do you have?",
      "What are some weird habits that you have?",
      "What do you spend the most money on?",
      "Do you have any pet peeves?",
      "What makes you angry?",
      "What line should someone never cross with you?",
      "What's something that you do differently than the majority of people you know?",
      "What's one of your most embarrassing habits or quirks?",
      "What do you do when you're nervous or anxious?",
      "Do you consider yourself more of a routine person or someone who thrives on spontaneity?",
      "Are you more of a clean-as-you-go or leave-it-for-later type of person?",
      "How do you handle criticism?",
      "Do you talk to yourself? If so, when and how often?",
      "What's one thing you secretly judge other people for?",
      "What habit have you tried to break but keep returning to?",
      "What's one habit you're proud of developing?",
      "Are you someone who runs late or arrives early?",
      "Do you multitask often, or prefer to focus on one thing at a time?",
      "How self-aware would you say you are on a scale from 1–10?",
      "What's one behavior you've unlearned that you're proud of?",
      "Do you prefer silence or background noise throughout the day?",
      "What's your go-to coping mechanism when you feel overwhelmed?",
      "Do you fidget, pace, or have any little physical habits you do without realizing?",
      "What have you learned about yourself in the past year?",
      "How do you think others perceive you compared to how you actually are?",
    ],
  },
  {
    id: "heroes", label: "Heroes & Identity", color: "#fff5f0", accent: "#9a5030",
    questions: [
      "Who's your biggest hero?",
      "If you could sit down with your 13-year-old self, what would you say?",
      "What would your rock band group be called or if you were a rapper what would your rap name be?",
      "What's one trait you admire most in others?",
      "What's something you've done that would make your younger self proud?",
      "Who shaped your identity the most growing up?",
      "Who do you think understands you best?",
      "What roles or titles in your life mean the most to you?",
      "How has your sense of self evolved over the years?",
      "What do you consider to be the core of who you are?",
      "Who do you look up to in your personal life?",
      "Is there a fictional character you relate to deeply?",
      "Do you feel like you're becoming the person you always wanted to be?",
      "If someone had to describe you without using your job or physical appearance, what would you want them to say?",
      "What part of your identity has remained constant over the years?",
      "What's something you've always believed about yourself that turned out to be untrue?",
      "How do you define your personal integrity?",
      "What makes you feel most like you?",
      "Who do you think sees the real you, and why?",
      "If you had to pick one value to live by for the rest of your life, what would it be?",
      "What's a personal 'win' that felt bigger than anything you've been publicly celebrated for?",
      "When do you feel most confident in yourself?",
      "What makes you feel misunderstood, if anything?",
      "Do you ever feel pressure to be someone you're not?",
      "How do you want to be remembered by the people who know you best?",
      "If you could be any age, what age would you choose?",
    ],
  },
  {
    id: "imagination", label: "Imagination & What Ifs", color: "#fffaf4", accent: "#8a6820",
    questions: [
      "Would you rather be invisible or have X-ray vision?",
      "If you could only save one item from a house fire, what would it be?",
      "What is the one food you could eat every day for the rest of your life?",
      "Where's the most exotic place you've ever been?",
      "What time period would you travel to if time machines existed?",
      "What would be the title of your memoir?",
      "What bores you faster than anything else?",
      "What would you do if you were home alone and the power went out?",
      "What event would you love to attend in the near future?",
      "If a genie granted you one wish, what would you ask for (and why)?",
      "If you could live in any fictional world for a week, where would you go?",
      "If money wasn't a factor, how would you spend your days?",
      "If we could teleport anywhere for dinner tonight, where would we go?",
      "If you had to live in another country for a year, which one would you choose?",
      "If you were an animal in a past life, what animal do you think you were?",
      "If you could be famous for one thing, what would it be?",
      "If you had to switch careers tomorrow, what would you want to do?",
      "If you had a secret superpower, what would it be and how would you use it?",
      "If our life together was a reality show, what would it be called?",
      "What would your dream house look like if there were no limitations?",
      "If you had to be quarantined again for a month, what three things would you hoard this time?",
      "If we had unlimited airline miles for one year, where would you want to go first?",
      "If someone made a documentary about your life, what would the main message be?",
      "If you could go back and relive one year of your life, which year would you choose and why?",
      "If you could swap lives with any person for 24 hours, who would it be?",
    ],
  },
  {
    id: "leadership", label: "Leadership & Integrity", color: "#fffcf0", accent: "#a08030",
    questions: [
      "How do you define good leadership?",
      "Who's the best leader you've ever known, and what made them stand out?",
      "Do you think being a good leader and being a good person always go hand in hand?",
      "What does leading by example mean to you?",
      "Have you ever been in a position of leadership? What did you learn about yourself?",
      "What's more important to you in a leader, vision or humility?",
      "How do you handle power or influence when it's given to you?",
      "When have you seen integrity tested in real life?",
      "Have you ever made a hard decision that no one else saw or understood?",
      "Do you believe people are born leaders, or learn to become leaders?",
      "What would make you lose respect for someone in a leadership position?",
      "What's one quality that makes you trust someone instantly?",
      "What's a moment when you chose to do the right thing even when it was hard?",
      "How do you recover when you feel like you've disappointed yourself?",
      "Would you rather be admired or respected? Why?",
      "What does accountability look like to you in a relationship or team?",
      "What's your philosophy on second chances?",
      "What's the most courageous decision you've ever made?",
      "What do you think the world needs more of in its leaders today?",
      "Do you consider yourself a leader in any area of your life?",
      "What lessons about integrity have you learned from past mistakes?",
      "When have you stood up for something, even if you were the only one?",
      "What's your personal definition of honor?",
      "How do you want to lead in your home, in your work, and in your community?",
    ],
  },
  {
    id: "legacy", label: "Life & Legacy", color: "#fff8f2", accent: "#806020",
    questions: [
      "What do you fear the most about life?",
      "When the time comes do you want to be buried or cremated?",
      "How do you want to be remembered?",
      "What impact do you hope to leave behind?",
      "What lessons do you hope others learn from your life?",
      "If you had to write your own eulogy, what would it say?",
      "What are the stories you want passed down to future generations?",
      "What do you think your younger self would be most proud of about who you are now?",
      "What moments in life feel most meaningful to you so far?",
      "What does a well-lived life look like in your eyes?",
      "Are there any family traditions or values you want to make sure continue after you're gone?",
      "If money were no object, what would you do with your life to leave a lasting mark?",
      "What kind of ancestor do you want to be remembered as?",
      "Have you ever thought about creating a legacy project or foundation?",
      "What do you believe is more important, what you do or how you make people feel?",
      "What are you doing now that your future self will thank you for?",
      "Have you had any 'life flashing before your eyes' moments that changed your perspective?",
      "Do you believe people can live on through their influence and memories?",
      "What's one thing you hope people say about you when you're not in the room?",
      "If you could pass down only one piece of advice, what would it be?",
      "What parts of your life do you hope get written about or remembered one day?",
      "How do you define a spiritual or emotional legacy?",
      "What does 'living life to the fullest' mean to you personally?",
      "What unfinished dreams do you still want to pursue?",
    ],
  },
  {
    id: "lifestyle", label: "Lifestyle & Personal Habits", color: "#fffaf4", accent: "#8a6828",
    questions: [
      "How do you feel about dirty dishes being left in the sink overnight?",
      "How often do you clean your bathroom?",
      "How do you feel about wearing shoes inside the house?",
      "How do you feel about plastic and recycling?",
      "What's the priority on your list of things to do this week?",
      "What's the one thing you can't give up no matter how hard you try?",
      "Do you collect anything?",
      "Do you believe pets should be allowed in bed and on furniture?",
      "How often do you get a new cell phone?",
      "Where do you get your news?",
      "What does self-care look like for you?",
      "How much sleep do you ideally need to feel like your best self?",
      "Do you prefer early mornings or late nights?",
      "Do you have a morning or evening routine that's sacred to you?",
      "What's one daily habit that helps your mood or productivity?",
      "How do you usually spend your weekends?",
      "What's your grocery shopping style — plan everything or go with the flow?",
      "Are you more of a meal prepper or takeout person during busy weeks?",
      "What are your most important non-negotiables in your weekly routine?",
      "Do you tend to multitask or focus on one thing at a time?",
      "How clean or tidy do you like your space to be?",
      "What's your philosophy when it comes to managing time?",
      "Do you keep a to-do list or planner?",
      "What's your screen time like on an average day?",
      "What's one habit you'd like to improve or break this year?",
    ],
  },
  {
    id: "love", label: "Love, Intimacy & Connection", color: "#fff5f0", accent: "#b4643c",
    questions: [
      "What does a healthy romantic relationship look like to you?",
      "What are your non-negotiable traits in a romantic partner?",
      "How do you define love?",
      "Do you think it's possible to be in love with more than one person?",
      "What specifically makes you feel loved?",
      "How do you show someone you love them?",
      "What type of support is important to you when you're in a relationship?",
      "Do you know your love language?",
      "What do you believe keeps relationships strong?",
      "How romantic are you on a scale of 1 to 10?",
      "What does romance look like to you in a relationship?",
      "How important is intimacy in a relationship to you?",
      "How important is sex to you?",
      "How often would you want to have sex?",
      "How long do you think people should know each other before having sex?",
      "What are your thoughts on casual sex relationships?",
      "What turns you on sexually?",
      "What's your favorite part of my body?",
      "What part of your body do you want me to explore?",
      "Morning sex or night sex?",
      "Shower together or bubble bath?",
      "What do you think it means to be 'good' in bed?",
      "What's your sexual fantasy?",
      "How was your first sexual experience?",
      "What do you wish we could spend more time doing together?",
      "How important are wedding anniversaries to you?",
      "How would you like to spend special days?",
      "What would you do if someone said something bad about me?",
      "Do you believe love can pull you through anything?",
      "What did you value the most in your previous relationship?",
      "What would be the most important thing for us to have in our relationship?",
      "What's at least one thing that you believe you could have done to make your last relationship work?",
      "What would you do if we fell out of love?",
      "What do you think is the best way to keep love alive in a relationship?",
      "What's your attachment style?",
      "Do you think arguing is part of a healthy relationship? Why or why not?",
      "What's your ideal first date?",
      "What's your idea of a perfect date?",
      "Love vs In Love: What do you believe the difference is?",
      "What are your thoughts on public displays of affection?",
      "Have you ever cheated in a relationship?",
      "What made you want to get to know me better?",
      "Do you believe in soulmates or twin flames?",
      "Have you ever been in love?",
      "What makes you fall in love with someone?",
      "Do you believe in love at first sight?",
      "What's the longest romantic relationship you've been in?",
      "When we are apart what do you miss most about me?",
      "Would you rather someone be honest and hurt your feelings or lie to protect them?",
      "How can someone earn your trust?",
      "How can someone lose your trust?",
      "What have been the best times of your life so far?",
      "What's the best advice someone has ever given you?",
      "What's one of the best decisions you've ever made?",
      "When have your values and morals been compromised?",
      "Do you believe what is meant for you will never miss you?",
    ],
  },
  {
    id: "memory", label: "Memory & Nostalgia", color: "#fffbf4", accent: "#9a7828",
    questions: [
      "Who do you miss more than anyone else (living or deceased)?",
      "What smell brings back great memories?",
      "What do you remember most about your first job?",
      "How old were you when you started working?",
      "What is your favorite kitchen smell?",
      "What's the most embarrassing thing that's ever happened to you?",
      "What's a memory that always makes you smile no matter what?",
      "What song instantly takes you back to a different time in your life?",
      "What's your favorite holiday memory from childhood?",
      "What old tradition do you wish would make a comeback?",
      "What's a movie or TV show that reminds you of your childhood?",
      "What item from your past do you wish you had held onto?",
      "What did your childhood bedroom look like?",
      "What was your favorite toy growing up?",
      "What was your go-to snack or treat as a kid?",
      "What's a memory you've never shared with anyone before?",
      "What was your proudest moment as a teenager?",
      "Who was your childhood hero?",
      "What's one moment from our time together that you never want to forget?",
      "What's the earliest memory you can recall?",
      "What was your favorite birthday celebration ever?",
      "Have you ever gone back to visit a place from your past?",
      "What do you miss most about the way things 'used to be'?",
      "What moment in your life felt like pure magic?",
      "What was your favorite family tradition growing up?",
      "What's one photo or keepsake that means a lot to you?",
      "What's something you wish you could relive just one more time?",
      "What's the nicest thing a family member has ever done for you?",
      "What's one thing you've won?",
    ],
  },
  {
    id: "mental", label: "Mental & Emotional Health", color: "#fff8f4", accent: "#806828",
    questions: [
      "What makes you nervous or anxious?",
      "What challenges are you currently dealing with?",
      "What challenges have you overcome?",
      "What's one thing that you believe you failed at?",
      "What makes you feel at peace?",
      "How do you usually cope when you're feeling overwhelmed?",
      "What signs should I look for when you're emotionally off balance?",
      "How do you want me to support you when you're going through something hard?",
      "When was the last time you felt truly heard and understood?",
      "What emotion do you find the hardest to express?",
      "What's something that triggers you that you wish people understood better?",
      "How do you reset after a bad day?",
      "When do you feel the most confident and grounded?",
      "What tends to drain your energy the fastest?",
      "What do you wish people knew about your inner world?",
      "What thoughts tend to keep you up at night?",
      "How do you practice emotional self-care?",
      "What helps you bounce back after disappointment?",
      "How did your family handle emotions when you were growing up?",
      "What role does forgiveness play in your healing journey?",
      "When you're in a dark place, what usually helps you find the light again?",
      "Do you find it hard to ask for help? Why or why not?",
      "What would emotional safety in a relationship look like for you?",
      "What helps you feel mentally and emotionally recharged?",
      "What's something you've learned about your emotional needs in the past year?",
    ],
  },
  {
    id: "money", label: "Money, Work & Lifestyle", color: "#fffcf0", accent: "#a08428",
    questions: [
      "How do you believe finances should be handled between married couples or couples who live together?",
      "Who will take care of the financial matters of the household?",
      "Would you share all of your money with your spouse or split the money into different accounts?",
      "How important is your credit score to you?",
      "How much current debt do you have?",
      "How do you feel about financing purchases?",
      "What if we both want something but can't afford both?",
      "Are you a saver, investor, or spender?",
      "Do you feel it is important to save for retirement?",
      "Would you be willing to get a second job if we had financial problems?",
      "What if a family member wants to borrow a large sum of money?",
      "If you were to start a business, what kind would it be?",
      "What's more important, a nice house or a nice car?",
      "Would you be open to creating a budget together and tracking our monthly spending?",
      "What's something you'd consider a 'luxury worth investing in'?",
      "What are your money triggers or stressors?",
      "What's a money lesson you had to learn the hard way?",
      "If money wasn't an issue, what would your daily life look like?",
      "How would you describe your work ethic?",
      "What's the best career decision you've ever made?",
      "What's the worst career decision you've ever made?",
      "Do you consider yourself good at networking?",
      "What career advice would you give to your younger self?",
      "What qualities do you look for in a boss?",
      "How do you motivate yourself in your career?",
      "How do you deal with work stress?",
      "How do you handle career setbacks?",
      "What's one work-related thing you want to accomplish in the next year?",
      "Who has had the biggest impact on your career choice?",
      "What does your family think of your career?",
      "If you could do it all over again, would you pursue the same career? Why or why not?",
      "Does your work routine vary, or does it look the same every day/week?",
      "Have you ever had to relocate for work?",
      "Would you ever relocate for work if you were asked to?",
      "Have you ever been on a cool business trip?",
      "When will you know you've 'made it'?",
      "What job have you enjoyed the most?",
      "What job have you enjoyed the least?",
      "Why did you choose your current job/career?",
      "Who or what inspires you in your career?",
      "Is there one job you'd never ever do?",
      "What type of role do you want to take on after this one?",
      "Are you more of a 'work to live' or a 'live to work' type of person?",
      "Does your job make you feel happy and fulfilled? Why or why not?",
      "How would your 10-year-old self react to what you do now?",
      "Would you ever want to take a sabbatical or work remotely for a year?",
      "What's your ideal work-life balance look like?",
      "What's your dream job?",
    ],
  },
  {
    id: "motivation", label: "Motivation & Inspiration", color: "#fff5f0", accent: "#9a5030",
    questions: [
      "What motivates you most in life?",
      "What has inspired you the most recently?",
      "What keeps you going on days when you feel discouraged?",
      "What's a personal mantra or quote you live by?",
      "When was the last time you felt deeply inspired by someone else's story?",
      "What does success mean to you on a soul level?",
      "When in your life have you felt the most driven and focused?",
      "What's something you've accomplished that made you feel unstoppable?",
      "How do you refuel your energy when your motivation runs low?",
      "Is your motivation more internal or external?",
      "What role does your spiritual or belief system play in keeping you inspired?",
      "Who is someone you've never met that's made a big impact on your life?",
      "When you imagine your best self, what does that version of you look like?",
      "What's something you've always wanted to do but haven't started yet? What's been stopping you?",
      "What's your why — the thing that pulls you forward even when things get hard?",
      "How do you typically respond to failure or rejection?",
      "What inspires you more, the vision of what could be, or the fear of staying the same?",
      "Do you feel like your current life is aligned with what inspires you most?",
      "What's a dream you haven't shared with many people?",
      "When do you feel the most lit up or alive?",
      "What do you hope inspires others about you?",
      "If you could teach one motivational message to the next generation, what would it be?",
      "How do you want to be remembered by the people who love you?",
      "What's something you'd like to explore just for the joy of it, not because it's 'productive'?",
      "When was the last time you felt creatively inspired and what sparked it?",
    ],
  },
  {
    id: "movies", label: "Movies & TV", color: "#fffaf4", accent: "#906828",
    questions: [
      "Who is your favorite actor or actress?",
      "If your life was a movie, which celebrity would play you?",
      "What is your favorite movie of all time and why does it mean so much to you?",
      "What movie have you seen more than three times and would gladly watch again?",
      "What's an old movie you'd love to experience on the big screen one more time?",
      "What's the worst movie you've ever seen and did you finish it or walk out?",
      "What's the most romantic movie you've ever watched, and what made it special?",
      "Do you prefer watching movies at home or going out to the theater for the full experience?",
      "If you could live inside any movie, which one would you choose and why?",
      "Is there a movie character you deeply relate to, someone who feels like a mirror of you?",
      "What do you think about reality TV, is it your guilty pleasure or not your thing at all?",
      "Do you have a favorite reality show you always get pulled into?",
      "What movie do you think is wildly overrated?",
      "What's a documentary that changed your perspective or really stayed with you?",
      "What's your favorite scary movie, and do you actually like being scared?",
      "What's your go-to comfort TV show, the one you put on to unwind or feel better?",
      "What was the last show you binge-watched all the way through?",
      "Which show have you rewatched multiple times and never get tired of?",
      "What's your favorite old-school sitcom that still makes you laugh?",
      "What's a show that got canceled too soon that you'd bring back in a heartbeat?",
      "If we had a movie night right now, what would we watch first?",
      "Do you enjoy watching things together in silence or talking during the show?",
      "What type of movies or shows do you think we should explore together more often?",
      "Is there a movie that reminds you of us or a moment in our relationship?",
      "What genre do you feel describes your life right now, comedy, drama, action, or something else?",
    ],
  },
  {
    id: "past", label: "Past Patterns & Healing", color: "#fff8f4", accent: "#806428",
    questions: [
      "What's something in your life right now that shows consistency and follow-through?",
      "What's something you do regularly that reflects your commitment to yourself or others?",
      "In what ways do you show up with integrity, even when no one's watching?",
      "What ended your last relationship, and what did you learn from that experience?",
      "How do you feel about your ex now and has that feeling changed over time?",
      "If your ex could describe you in one sentence, what do you think they'd say?",
      "What relationship patterns have you noticed in your past and are you still working on them?",
      "Was there a moment you knew you were ready to heal and grow for real?",
      "What part of your past still tries to show up in your present and how do you handle it?",
      "When was the last time you truly forgave yourself for something?",
      "What part of your healing journey are you most proud of?",
      "What do you wish someone had told you before your first serious relationship?",
      "Are there any relationship beliefs you used to have that you've outgrown?",
      "What triggers from past relationships do you still carry, even if just a little?",
      "What helps you feel safe enough to talk about your past without shame?",
      "Is there anything from your childhood that still affects the way you love today?",
      "What boundaries are you still learning to set with others or with yourself?",
      "When have you had to choose healing over reacting?",
      "Have you ever mistaken a trauma bond for love?",
      "What does emotional safety in a relationship look like for you?",
      "What would your younger self be proud to see in your current relationship?",
      "What habits or patterns are you proud to have broken?",
      "How can I best support you when you feel emotionally triggered?",
      "What did your past teach you about the kind of love you deserve?",
      "How do you know when you've truly healed from something?",
    ],
  },
  {
    id: "growth", label: "Personal Growth & Emotional Intelligence", color: "#fffaf4", accent: "#8a6828",
    questions: [
      "How important is personal growth to you in this current season of life?",
      "How do you personally define happiness and has that definition changed over time?",
      "What truly makes you feel fulfilled, not just temporarily happy?",
      "Do you enjoy spending time alone, and what do you usually do with that time?",
      "How do you stay motivated when your goals feel far away or unclear?",
      "When you realize you're wrong, what's your process for offering a sincere apology?",
      "What's one thing that helps you come back to yourself when you feel lost or overwhelmed?",
      "When you want to give up, what thought or habit helps you keep going?",
      "Do you live by any specific mantras, affirmations, or words of wisdom?",
      "How do you typically bounce back from setbacks or disappointments?",
      "How do you process big emotions, are you more of a talk-it-out person or a think-it-through person?",
      "Do you consider yourself emotionally self-aware? Why or why not?",
      "What emotion do you struggle the most with and how are you learning to manage it?",
      "How do you handle criticism from others, especially when it's hard to hear?",
      "Is it easy for you to accept help, or do you tend to prefer doing things alone?",
      "What's something you've outgrown emotionally, but occasionally miss?",
      "What's something you regret not doing in the last year, and why?",
      "How do you want to grow as a partner over the next 6 months?",
      "What area of your personal development are you most focused on right now?",
      "What role has your environment played in your personal growth?",
      "How do you balance being ambitious with being present and at peace?",
      "What's one old version of yourself you're proud to have let go of?",
      "How do you respond when someone close to you is going through a hard time emotionally?",
      "What's one lesson life keeps trying to teach you?",
      "What's something you're working on emotionally that I may not realize?",
    ],
  },
  {
    id: "influence", label: "Personal Influence & Gratitude", color: "#fffbf0", accent: "#a07c28",
    questions: [
      "Who in your life challenges you in ways that have helped you grow?",
      "Who has had the most lasting impact on the person you've become?",
      "What's one life lesson someone taught you that you still live by today?",
      "Who are you most thankful for and have you told them recently?",
      "Who supported you the most during a difficult chapter of your life?",
      "What's one thing someone did for you that you'll never forget?",
      "Whose belief in you made you start believing in yourself?",
      "What's one small act of kindness you still think about years later?",
      "What's something you've inherited (physically, mentally, or emotionally) from someone you admire?",
      "Which teacher, mentor, or guide left a mark on your life?",
      "What qualities do you admire most in the people you look up to?",
      "Has anyone ever changed your mind in a way you're grateful for?",
      "What's something I do that you may not always say thank you for, but truly appreciate?",
      "What does it mean to you when someone expresses gratitude — words, actions, gifts, or something else?",
      "How do you personally like to show appreciation to others?",
      "What's something your younger self would thank you for today?",
      "What's something you're most grateful for in this current season of life?",
      "Who helped you get through a time you didn't think you'd make it through?",
      "What's a relationship that changed your life for the better, even if it didn't last?",
      "What role does gratitude play in your day-to-day mindset?",
      "What's something about me that you admire or feel inspired by?",
      "When was the last time someone said 'thank you' and it really meant something to you?",
      "Who do you hope to inspire the way others have inspired you?",
      "What does being 'rich in relationships' mean to you?",
      "How have I influenced who you are becoming?",
    ],
  },
  {
    id: "personality", label: "Personality & Preferences", color: "#fff8f2", accent: "#906030",
    questions: [
      "What would you say are your greatest personal strengths?",
      "What's one weakness you're working on (or learning to accept)?",
      "Would you rather be rich and miserable or poor and deeply fulfilled?",
      "Who do you talk to the most on a regular basis?",
      "Are you a planner or do you prefer to go with the flow?",
      "What's something that always gets under your skin, even if it shouldn't?",
      "Are you more introverted, extroverted, or somewhere in between?",
      "What's your most unpopular or controversial opinion (but you're standing by it)?",
      "What app(s) do you open every single day without fail?",
      "Do you prefer texting, voice notes, FaceTime, or in-person convos?",
      "What's your favorite curse word — the one that always hits just right?",
      "What's a guilty pleasure you fully lean into and don't plan on giving up?",
      "What instantly annoys the hell out of you (even if it's a little irrational)?",
      "How do you typically respond to big life changes — excitement, stress, avoidance?",
      "What's something you're a little insecure about (but trying to embrace)?",
      "Do you have any allergies or weird sensitivities?",
      "Are you an organ donor or have you ever thought about becoming one?",
      "How do you recharge when you're feeling drained — alone time, sleep, nature, connection?",
      "Are you a morning person or a night owl?",
      "How clean or cluttered is your car at any given moment?",
      "What's a small, everyday luxury that makes you feel like you're doing life right?",
      "Would you say you overthink things or trust your gut more often?",
      "What are your top love languages (giving vs. receiving)?",
      "Do you usually go along with the crowd or forge your own path?",
      "What's something about your personality that people often misunderstand?",
      "If you could describe yourself in three words, what would they be?",
      "On a scale of 1-10, how organized are you?",
      "What is one thing you can't live without?",
      "How long can you go without checking your phone?",
    ],
  },
  {
    id: "adventure", label: "Preferences, Adventure & Experience", color: "#fffaf4", accent: "#8a6820",
    questions: [
      "If you had to pick one — skydiving, bungee jumping, or scuba diving — which would you do?",
      "When you were a kid, what did you think your life would look like now?",
      "What was your worst fashion disaster?",
      "What's the most embarrassing thing you did at school / when you were a kid?",
      "If you had a reality TV show about your life, what would your theme song and title of the show be?",
      "What's your plan if there was a zombie apocalypse?",
      "If you could go anywhere in the world, where would you go?",
      "If you took a road trip across the country, who would you take with you?",
      "Who would you want to be stranded on an island with?",
      "Where is the fanciest place you've ever eaten?",
      "What's your go-to midnight snack?",
      "What's your favorite scent?",
      "What's your favorite season?",
      "If you could have an exotic animal, what would it be?",
      "If you could be an animal, what would it be?",
      "What's the best name for a pet?",
      "What would make a perfect day?",
      "If you could go on a shopping spree anywhere, where would it be?",
      "If you had to wear just one color for the rest of your life, what would it be?",
      "What's the best vacation you've ever been on?",
      "Where's the next place on your travel list?",
      "What is your dream vacation?",
      "What's the best thing about traveling?",
      "What's the worst thing about traveling?",
      "How many hours do you get to the airport before a flight?",
      "What do you like most about where you live?",
      "If you could only pack one thing for a trip (besides clothing) what would it be?",
      "Would you want to live on a boat, a mountain or an island?",
      "What would be the perfect birthday gift for you?",
      "Ideally, how would you spend your birthday?",
      "What is your least favorite chore?",
    ],
  },
  {
    id: "reflection", label: "Reflection & Growth", color: "#fff8f4", accent: "#805c24",
    questions: [
      "What is your biggest regret?",
      "What are you most disappointed by?",
      "Have you ever stolen anything?",
      "What's the scariest thing you've ever done, and why did you do it?",
      "Do you believe you should do one thing a day that scares you?",
      "What do you wish you knew years ago that you know now?",
      "What's something that made you rethink your perspective?",
      "What's different about you or your life today in comparison to a year ago?",
      "What do you like the most about yourself?",
      "What have you recently learned about life, about yourself, or about love?",
      "What's something that you are genuinely looking forward to?",
      "What good news have you recently found out or shared?",
      "What's the most important thing I should know about you?",
      "What's one thing about you that no one or very few people know?",
      "What's your personal mantra or life philosophy?",
      "What's one thing you don't necessarily regret, but would do differently if given the chance?",
      "What are you most proud of, even if no one else knows about it?",
      "When was a time you had to surrender and trust things would work out, and they did?",
      "What's your greatest achievement so far in life?",
      "What are you grateful for right now, big or small?",
      "What are you really, really good at — that makes you feel like your best self?",
      "What's something you're actively working to improve about yourself?",
      "What weird or random talent do you have that surprises people?",
      "What talent or ability do you wish you naturally had?",
      "What part of your healing or growth are you most excited to keep unfolding?",
      "What was the last New Year's resolution you actually kept?",
      "When was the last time you cried?",
    ],
  },
  {
    id: "relationships", label: "Relationships & People", color: "#fff5f0", accent: "#9a5030",
    questions: [
      "Who are the most important people in your life?",
      "Who can you depend on no matter what?",
      "Who's your emergency contact, and why them?",
      "What's your relationship like with your siblings?",
      "What's your relationship like with your parents?",
      "Do you wish you had more siblings or fewer? Why?",
      "Who's your best friend, and what makes that relationship special?",
      "How do you interact with someone who disagrees with you?",
      "Who do you feel safest being vulnerable with, and what makes that connection feel safe?",
      "Who's been in your life the longest, and how has that relationship changed over time?",
      "What do you admire most about your inner circle?",
      "Have you ever had to cut someone off for your peace? What happened?",
      "When have you felt most supported by someone you love?",
      "What relationship in your life has surprised you the most in a good way?",
      "How do you set boundaries with people you care about?",
      "What kind of friend are you when someone's going through a hard time?",
      "Who do you want to spend more time with?",
      "What's a relationship you've outgrown but still reflect on sometimes?",
      "Who do you go to when you're excited about something?",
      "Who do you go to when you're disappointed?",
      "What's a memory you treasure with someone close to you?",
      "Have you ever had to apologize in a way that changed a relationship?",
      "Who in your life gives you a reality check when you need it?",
      "What relationship taught you the most about who you are?",
      "How do you hope people feel after spending time with you?",
    ],
  },
  {
    id: "roles", label: "Roles, Gender & Expectations", color: "#fffcf0", accent: "#a08030",
    questions: [
      "What do you believe the role of a spouse is?",
      "Once married, who do you believe comes first, your spouse or your children?",
      "Once married, who will make the biggest decisions in the household?",
      "Once married or living together, do you believe it's okay to open each other's mail?",
      "Who should handle household chores, and how should responsibilities be divided?",
      "What does submission look like to you in a relationship?",
      "What does respect look like to you in a relationship?",
      "What does partnership mean to you?",
      "Do you believe roles in a relationship should be traditional, flexible, or redefined altogether?",
      "How do you feel about gender roles when it comes to parenting?",
      "Do you believe men and women should express emotions the same way in relationships?",
      "What are your thoughts on 'masculine' and 'feminine' energy in relationships?",
      "Have your views on gender roles changed over time? If so, how?",
      "Do you believe one partner should always lead, or should leadership shift depending on the situation?",
      "What assumptions do people make about your gender that you don't agree with?",
      "What is something you admire about how the opposite gender shows up in relationships?",
      "Have you ever felt pressure to conform to a role that didn't feel authentic to you?",
      "What are your expectations of a spouse when it comes to family dynamics or in-laws?",
      "What would equality in a relationship look like for you day-to-day?",
      "What does being 'taken care of' look like to you — emotionally, physically, financially?",
      "How should parenting responsibilities be shared, if at all?",
      "How do you define strength in a partner and does that differ by gender?",
      "Do you think love looks different when expressed by men vs. women?",
      "What kind of example would you want your relationship to set for others?",
      "Big wedding or small intimate ceremony?",
    ],
  },
  {
    id: "sleep", label: "Sleep, Dreams & Spirituality", color: "#fff8f4", accent: "#806030",
    questions: [
      "How often do you dream at night?",
      "What was your last dream about?",
      "Do you tend to remember your dreams?",
      "Have you ever had a dream that felt like a message or warning?",
      "Have you ever had a recurring dream?",
      "What's the most peaceful dream you've ever had?",
      "What's the most unsettling dream you've ever had?",
      "Do you believe dreams mean something deeper or are they just random?",
      "Have you ever had a dream that came true?",
      "Do you believe in signs or synchronicities?",
      "Do you believe in ghosts or spirits?",
      "Do you believe in an afterlife?",
      "What's your spiritual background or upbringing?",
      "Do you identify with a particular religion or spiritual path now?",
      "How do you define spirituality for yourself?",
      "What spiritual practices bring you peace or clarity?",
      "Have you ever felt spiritually connected to someone?",
      "Do you believe soulmates are real?",
      "What's one spiritual belief or idea that has shaped how you see the world?",
      "Do you believe we choose our partners before we're born?",
      "Do you believe dreams can be influenced by what's happening in your relationship?",
      "How do you feel about energy healing or practices like meditation, crystals, or sound baths?",
      "Do you believe in guardian angels, spirit guides, or ancestors watching over you?",
      "Have you ever had a spiritual experience you couldn't explain?",
      "How does your bedroom have to be set up for you to get the best quality of sleep?",
      "Are you a snoozer or do you get up as soon as your alarm goes off?",
    ],
  },
  {
    id: "tech", label: "Tech & Gadgets", color: "#fffaf4", accent: "#8a6828",
    questions: [
      "What was your first email address?",
      "What do you wish your phone could do?",
      "Phone case or no case?",
      "Are you team iPhone or team Android?",
      "What's one app you couldn't live without?",
      "What's your most-used app right now?",
      "Do you prefer texting, calling, or voice notes?",
      "Are you someone who updates your phone as soon as new versions come out?",
      "Do you use smart devices in your home?",
      "Do you think technology makes relationships easier or harder?",
      "What's one gadget you secretly (or not-so-secretly) want?",
      "Do you read the terms and conditions or just scroll and hit accept?",
      "Do you use your phone in bed or try to unplug at night?",
      "Are you more of a minimalist or a tech collector?",
      "What's your favorite piece of technology you've ever owned?",
      "Have you ever lost something important because of a tech fail?",
      "Do you back up your phone regularly?",
      "What's your stance on smartwatches, love them or leave them?",
      "Would you rather give up social media or your phone entirely for 30 days?",
      "What's the most embarrassing thing you've ever accidentally sent in a message?",
      "How many unread emails do you have right now?",
      "Do you use tech to track your health, fitness, or habits?",
      "What's your favorite way to stay organized digitally?",
      "What would you invent if you could create a new tech gadget today?",
      "Do you think we rely too much on technology, or do you love the convenience?",
    ],
  },
  {
    id: "truth", label: "Truth & Intuition", color: "#fff5f0", accent: "#9a5030",
    questions: [
      "How can you tell when someone is lying?",
      "If someone offered to tell you about your future, what would you want to know?",
      "Do you usually trust your gut or second-guess yourself?",
      "What does your intuition feel like in your body?",
      "Have you ever had a 'knowing' about something that later turned out to be true?",
      "Do you believe in energy, vibes, or a sixth sense?",
      "Have you ever ignored your intuition and regretted it?",
      "What helps you make hard decisions — logic, emotion, or intuition?",
      "How do you know when something is in alignment with you?",
      "What's something you've felt guided to do even when it didn't make sense?",
      "Do you think everyone has intuition, or only some people?",
      "Have you ever felt someone's energy shift without them saying a word?",
      "What does 'truth' mean to you in a relationship?",
      "What's one truth about yourself that took time to fully accept?",
      "Are you more honest with others or with yourself?",
      "Have you ever told a difficult truth that strengthened a relationship?",
      "Do you ever get intuitive nudges about people when you first meet them?",
      "Do you believe dreams can reveal truth or insight?",
      "What's one truth you're currently sitting with or processing?",
      "How do you decide when to speak your truth and when to stay silent?",
      "Have you ever called something out that nobody else noticed?",
      "What helps you discern between fear and intuition?",
      "What signs or synchronicities show up when you're on the right path?",
      "Do you think we always know deep down what the right thing is?",
      "What helps you reconnect with your truth when you feel unsure?",
      "What are some strange things that people you know believe?",
    ],
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function isAvailable(usedMap, categoryId, questionText) {
  const key = `${categoryId}::${questionText}`;
  const usedAt = usedMap[key];
  if (!usedAt) return true;
  const days = (Date.now() - new Date(usedAt).getTime()) / (1000 * 60 * 60 * 24);
  return days >= COOLDOWN_DAYS;
}

function getDailyQuestion(categoryId, questions, usedMap) {
  const available = questions.filter((q) => isAvailable(usedMap, categoryId, q));
  if (available.length === 0) return null;
  const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return available[seed % available.length];
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px", color: "#fff", fontSize: "15px", fontFamily: "'DM Sans', sans-serif",
    padding: "14px 16px", outline: "none", boxSizing: "border-box", marginBottom: "12px", transition: "border-color 0.2s ease",
  };

  const handleSubmit = async () => {
    setError(""); setSuccessMsg("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (mode === "signup" && password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: e } = await supabase.auth.signUp({ email, password });
        if (e) throw e;
        setSuccessMsg("Account created! Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError("Enter your email address above first."); return; }
    setLoading(true);
    const { error: e } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (e) { setError(e.message); return; }
    setSuccessMsg("Password reset link sent! Check your email.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5efe6", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lora:ital,wght@1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder { color: #c0a080; }
        input:focus { border-color: rgba(160,120,48,0.5) !important; }
      `}</style>

      <div style={{ width: "100%", maxWidth: "400px", background: "#fff", border: "1px solid rgba(139,90,43,0.18)", borderRadius: "24px", padding: "40px 32px", animation: "fadeIn 0.5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
    
          <h1 style={{ margin: "0 0 6px 0", fontFamily: "'Playfair Display', Georgia, serif", fontSize: "26px", fontWeight: "900", background: "linear-gradient(135deg, #f5e6c8 0%, #d4a84e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Tonight's Connection
          </h1>
          <p style={{ margin: 0, color: "#8b6a4a", fontSize: "13px", fontFamily: "'Lora', serif", fontStyle: "italic" }}>
            994 questions for deeper love
          </p>
        </div>

        <div style={{ display: "flex", background: "#f5efe6", borderRadius: "12px", padding: "4px", marginBottom: "24px" }}>
          {["signin", "signup"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setSuccessMsg(""); }}
              style={{ flex: 1, background: mode === m ? "#fff" : "transparent", border: `1px solid ${mode === m ? "rgba(160,120,48,0.4)" : "transparent"}`, borderRadius: "10px", color: mode === m ? "#8a6220" : "#a08060", cursor: "pointer", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", fontWeight: "600", padding: "9px", transition: "all 0.2s ease" }}>
              {m === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        {mode === "signup" && (
          <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        )}

        {error && <div style={{ background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.25)", borderRadius: "10px", color: "#8b2020", fontSize: "13px", padding: "10px 14px", marginBottom: "14px" }}>{error}</div>}
        {successMsg && <div style={{ background: "rgba(60,140,80,0.08)", border: "1px solid rgba(60,140,80,0.25)", borderRadius: "10px", color: "#2a6e3a", fontSize: "13px", padding: "10px 14px", marginBottom: "14px" }}>{successMsg}</div>}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", background: loading ? "rgba(160,120,48,0.3)" : "linear-gradient(135deg, #a07830, #c8943a)", border: "none", borderRadius: "12px", color: loading ? "rgba(255,255,255,0.5)" : "#fff", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", fontWeight: "700", letterSpacing: "0.04em", padding: "14px", textTransform: "uppercase", transition: "all 0.2s ease", marginBottom: "16px" }}>
          {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
        </button>

        {mode === "signin" && (
          <button onClick={handleForgotPassword} style={{ background: "none", border: "none", color: "#a08060", cursor: "pointer", display: "block", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", margin: "0 auto", padding: "4px", textAlign: "center", textDecoration: "underline" }}>
            Forgot password?
          </button>
        )}
        {mode === "signup" && (
          <p style={{ color: "#a08060", fontSize: "11px", textAlign: "center", margin: "12px 0 0 0", lineHeight: "1.5" }}>
            Both partners use the same account to share question history across all devices.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── QUESTION CARD ────────────────────────────────────────────────────────────
function QuestionCard({ question, category, onUse, isUsed }) {
  const [justUsed, setJustUsed] = useState(false);
  const [localUsed, setLocalUsed] = useState(isUsed);

  const handleUse = () => {
    setLocalUsed(true); setJustUsed(true);
    onUse(question);
    setTimeout(() => setJustUsed(false), 2500);
  };

  return (
    <div style={{ background: justUsed ? `${category.accent}12` : "#fff", border: `1px solid ${localUsed ? category.accent + "60" : "rgba(139,90,43,0.12)"}`, borderRadius: "16px", padding: "20px 22px", marginBottom: "10px", opacity: localUsed && !justUsed ? 0.5 : 1, transition: "all 0.3s ease" }}>
      <p style={{ margin: "0 0 14px 0", color: localUsed && !justUsed ? "#c0a880" : "#2c1a0e", fontSize: "15px", lineHeight: "1.6", fontFamily: "'Lora', Georgia, serif", fontStyle: "italic" }}>
        {question}
      </p>
      {!localUsed ? (
        <button onClick={handleUse} style={{ background: category.accent, border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: "700", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em", padding: "8px 16px", cursor: "pointer", textTransform: "uppercase" }}>
          ✓ Use This Tonight
        </button>
      ) : (
        <span style={{ fontSize: "12px", color: category.accent, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.04em", opacity: 0.7 }}>
          {justUsed ? "✨ Saved to your account — returns in 180 days" : "Used · Returns in 180 days"}
        </span>
      )}
    </div>
  );
}

// ─── CATEGORY VIEW ────────────────────────────────────────────────────────────
function CategoryView({ category, usedMap, onUse, onBack }) {
  const [filter, setFilter] = useState("available");
  const available = category.questions.filter((q) => isAvailable(usedMap, category.id, q));
  const used = category.questions.filter((q) => !isAvailable(usedMap, category.id, q));
  const shown = filter === "available" ? available : used;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <button onClick={onBack} style={{ background: "#fff", border: "1px solid rgba(139,90,43,0.2)", borderRadius: "10px", color: "#8b6a4a", cursor: "pointer", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", padding: "8px 16px", marginBottom: "24px" }}>
        ← All Categories
      </button>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <h2 style={{ margin: 0, color: category.accent, fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: "700" }}>{category.label}</h2>
        </div>
        <p style={{ margin: 0, color: "#8b6a4a", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }}>{available.length} available · {used.length} resting</p>
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {["available", "resting"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? `${category.accent}15` : "#fff", border: `1px solid ${filter === f ? category.accent : "rgba(139,90,43,0.18)"}`, borderRadius: "8px", color: filter === f ? category.accent : "#a08060", cursor: "pointer", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", fontWeight: "600", letterSpacing: "0.04em", padding: "7px 14px", textTransform: "capitalize" }}>
            {f === "available" ? `${available.length} Available` : `${used.length} Resting`}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "#b0906a", fontFamily: "'Lora', serif", fontStyle: "italic" }}>
          {filter === "available" ? "All questions in this category are resting." : "No questions used yet in this category."}
        </div>
      ) : shown.map((q, i) => (
        <QuestionCard key={i} question={q} category={category} isUsed={!isAvailable(usedMap, category.id, q)} onUse={(question) => onUse(category.id, question)} />
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [usedMap, setUsedMap] = useState({});
  const [dataLoading, setDataLoading] = useState(false);
  const [tab, setTab] = useState("daily");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [usedToast, setUsedToast] = useState(false);

  // Listen for auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load used questions from Supabase
  useEffect(() => {
    if (!session) { setUsedMap({}); return; }
    setDataLoading(true);
    supabase.from("used_questions").select("category_id, question, used_at").eq("user_id", session.user.id)
      .then(({ data, error }) => {
        if (!error && data) {
          const map = {};
          data.forEach(({ category_id, question, used_at }) => { map[`${category_id}::${question}`] = used_at; });
          setUsedMap(map);
        }
        setDataLoading(false);
      });
  }, [session]);

  // Mark a question used
  const handleUse = useCallback(async (categoryId, question) => {
    if (!session) return;
    const now = new Date().toISOString();
    const key = `${categoryId}::${question}`;
    setUsedMap((prev) => ({ ...prev, [key]: now }));
    setUsedToast(true);
    setTimeout(() => setUsedToast(false), 3000);
    await supabase.from("used_questions").upsert(
      { user_id: session.user.id, category_id: categoryId, question, used_at: now },
      { onConflict: "user_id,category_id,question" }
    );
  }, [session]);

  const handleSignOut = async () => await supabase.auth.signOut();

  const totalAvailable = ALL_CATEGORIES.reduce((sum, cat) => sum + cat.questions.filter((q) => isAvailable(usedMap, cat.id, q)).length, 0);
  const totalUsed = ALL_CATEGORIES.reduce((sum, cat) => sum + cat.questions.filter((q) => !isAvailable(usedMap, cat.id, q)).length, 0);
  const dailyQuestions = ALL_CATEGORIES.map((cat) => ({ category: cat, question: getDailyQuestion(cat.id, cat.questions, usedMap) })).filter((d) => d.question !== null);

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: "#f5efe6", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#8b6a4a", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>Loading…</div>
    </div>
  );

  if (!session) return <AuthScreen />;

  return (
    <div style={{ minHeight: "100vh", background: "#f5efe6", fontFamily: "'DM Sans', sans-serif", color: "#2c1a0e" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lora:ital,wght@0,400;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(139,90,43,0.25); border-radius: 4px; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: "#efe8dc", borderBottom: "1px solid rgba(139,90,43,0.15)", padding: "16px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: "900", letterSpacing: "-0.02em", background: "linear-gradient(135deg, #2c1a0e 0%, #a07830 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Tonight's Connection
              </h1>
              <p style={{ margin: 0, fontSize: "11px", color: "#8b6a4a", letterSpacing: "0.04em" }}>
                {dataLoading ? "Loading your history…" : `${totalAvailable} ready · ${totalUsed} resting`}
              </p>
            </div>
            <button onClick={handleSignOut} style={{ background: "#fff", border: "1px solid rgba(139,90,43,0.22)", borderRadius: "8px", color: "#8b6a4a", cursor: "pointer", fontSize: "11px", fontFamily: "'DM Sans', sans-serif", padding: "6px 12px" }}>
              Sign Out
            </button>
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "14px" }}>
            {[{ id: "daily", label: "Daily Questions", icon: "✦" }, { id: "browse", label: "Browse by Category", icon: "⊞" }].map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); setSelectedCategory(null); }}
                style={{ flex: 1, background: tab === t.id ? "rgba(160,120,48,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(160,120,48,0.4)" : "rgba(139,90,43,0.18)"}`, borderRadius: "10px", color: tab === t.id ? "#8a6220" : "#a08060", cursor: "pointer", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", fontWeight: "600", letterSpacing: "0.03em", padding: "9px 12px", transition: "all 0.2s ease" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TOAST */}
      {usedToast && (
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "#a07830", color: "#fff", borderRadius: "12px", padding: "12px 20px", fontSize: "13px", fontWeight: "600", zIndex: 999, maxWidth: "320px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", animation: "fadeIn 0.3s ease" }}>
          ✨ Saved to your account — returns in 180 days
        </div>
      )}

      {/* CONTENT */}
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "24px 16px 80px" }}>

        {tab === "daily" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ margin: "0 0 6px 0", fontFamily: "'Playfair Display', serif", fontSize: "26px", fontWeight: "700", color: "#2c1a0e" }}>Tonight's Questions</h2>
              <p style={{ margin: 0, color: "#8b6a4a", fontSize: "14px" }}>One from each category, refreshed daily. Pick one and start connecting.</p>
            </div>
            {dailyQuestions.map(({ category, question }) => (
              <div key={category.id} style={{ background: "#fff", border: `1px solid ${category.accent}40`, borderRadius: "20px", padding: "20px", marginBottom: "14px", boxShadow: "0 1px 8px rgba(139,90,43,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                  <span style={{ color: category.accent, fontSize: "10px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>— {category.label}</span>
                </div>
                <p style={{ margin: "0 0 16px 0", fontSize: "16px", lineHeight: "1.65", color: "#2c1a0e", fontFamily: "'Lora', Georgia, serif", fontStyle: "italic" }}>"{question}"</p>
                <button onClick={() => handleUse(category.id, question)}
                  style={{ background: category.accent, border: "none", borderRadius: "10px", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: "700", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em", padding: "10px 18px", textTransform: "uppercase" }}>
                  ✓ We'll Use This Tonight
                </button>
              </div>
            ))}
            {dailyQuestions.length === 0 && (
              <div style={{ textAlign: "center", padding: "64px 24px", color: "#b0906a" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🌙</div>
                <p style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: "18px", color: "#8b6a4a" }}>All questions are resting. They'll return over the next 90 days.</p>
              </div>
            )}
          </div>
        )}

        {tab === "browse" && !selectedCategory && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ margin: "0 0 6px 0", fontFamily: "'Playfair Display', serif", fontSize: "26px", fontWeight: "700", color: "#2c1a0e" }}>35 Categories</h2>
              <p style={{ margin: 0, color: "#8b6a4a", fontSize: "14px" }}>Browse all 994 questions by topic.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {ALL_CATEGORIES.map((cat) => {
                const avail = cat.questions.filter((q) => isAvailable(usedMap, cat.id, q)).length;
                const pct = Math.round((avail / cat.questions.length) * 100);
                return (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat)}
                    style={{ background: "#fff", border: `1px solid ${cat.accent}40`, borderRadius: "16px", cursor: "pointer", padding: "16px 14px", textAlign: "left", transition: "transform 0.15s ease, border-color 0.15s ease", boxShadow: "0 1px 6px rgba(139,90,43,0.06)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = cat.accent + "99"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = cat.accent + "40"; e.currentTarget.style.transform = "translateY(0)"; }}>
                    <div style={{ width: "20px", height: "2px", background: cat.accent, borderRadius: "2px", marginBottom: "10px" }}></div>
                    <div style={{ color: cat.accent, fontSize: "11px", fontWeight: "700", lineHeight: "1.3", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" }}>{cat.label}</div>
                    <div style={{ height: "3px", background: "rgba(139,90,43,0.12)", borderRadius: "2px", overflow: "hidden", marginBottom: "5px" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: cat.accent, borderRadius: "2px" }} />
                    </div>
                    <div style={{ fontSize: "10px", color: "#a08060", fontFamily: "'DM Sans', sans-serif" }}>{avail} of {cat.questions.length} available</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "browse" && selectedCategory && (
          <CategoryView category={selectedCategory} usedMap={usedMap} onUse={handleUse} onBack={() => setSelectedCategory(null)} />
        )}
      </div>
    </div>
  );
}
