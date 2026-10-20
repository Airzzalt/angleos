// SAMPLE CONTENT ONLY. Phase 0b shows these so every screen can be clicked through.
// Each screen is switched to real data in its own phase (see planning/08-build-order.md).

export const sampleProjects = [
  { id: "demo-sleep", name: "Aurora Sleep Mask", niche: "Sleep and wellness", market: "Australia", score: 8.1, updated: "2 hours ago", scripts: 6, angles: 12 },
  { id: "demo-bottle", name: "PureFlow Water Bottle", niche: "Hydration", market: "Australia", score: 6.4, updated: "Yesterday", scripts: 3, angles: 7 },
  { id: "demo-posture", name: "StraightUp Posture Corrector", niche: "Back and posture", market: "New Zealand", score: 4.2, updated: "3 days ago", scripts: 0, angles: 2 },
  { id: "demo-skin", name: "Glowform LED Mask", niche: "Skincare devices", market: "United States", score: 7.3, updated: "Last week", scripts: 9, angles: 15 },
];

export const sampleScripts = [
  { id: "s1", title: "Boredom-eater angle, 45s UGC", format: "UGC", project: "Aurora Sleep Mask", when: "Today" },
  { id: "s2", title: "Skeleton: what happens if you never sleep", format: "Skeleton", project: "Aurora Sleep Mask", when: "Today" },
  { id: "s3", title: "Morning-pain VSL, version 3", format: "VSL", project: "StraightUp Posture Corrector", when: "Yesterday" },
  { id: "s4", title: "Nine headlines for desk workers", format: "Static ad", project: "PureFlow Water Bottle", when: "Yesterday" },
];

export const scriptFormats = {
  Video: [
    { id: "vsl", name: "VSL", note: "Long-form video sales letter, 11 beats" },
    { id: "ugc", name: "UGC", note: "Creator-style testimonial or demo" },
    { id: "text-on-screen", name: "Text on screen", note: "Captions-led, no talking head" },
    { id: "ai-voiceover", name: "AI voiceover", note: "Narrated b-roll ad" },
  ],
  Static: [{ id: "static", name: "Static ad", note: "Nine headlines, then a full concept" }],
  Animated: [
    { id: "singing-drama", name: "Singing drama", note: "Song script, storyboard, visuals" },
    { id: "singing-basic", name: "Singing basic", note: "Simpler song-style ad" },
    { id: "skeleton", name: "Skeleton", note: "Day 1 to Day 365 escalation story" },
    { id: "crochet", name: "Crochet", note: "Crochet-style animation" },
    { id: "claymation", name: "Claymation", note: "Clay animation with transitions" },
    { id: "talking-objects", name: "Talking objects", note: "Everyday objects that talk" },
    { id: "zack-d-films", name: "Zack D Films", note: "Script-to-prompt cinematic style" },
  ],
} as const;

export const studioStyles = [
  { id: "singing-drama", name: "Singing drama", steps: 19, blurb: "Advanced song-led drama ads: script, song, storyboard, visuals." },
  { id: "singing-basic", name: "Singing basic", steps: 11, blurb: "A simpler song-style ad with AI-generated music." },
  { id: "skeleton", name: "Skeleton", steps: 12, blurb: "“What happens if you…” escalating story told by a skeleton." },
  { id: "crochet", name: "Crochet", steps: 11, blurb: "Handmade crochet look, built from still images." },
  { id: "claymation", name: "Claymation", steps: 11, blurb: "Clay-style scenes with smooth transitions and voice over." },
  { id: "talking-objects", name: "Talking objects", steps: 6, blurb: "Everyday objects that talk about your product." },
  { id: "zack-d-films", name: "Zack D Films", steps: 9, blurb: "Cinematic scenes built from a script-to-prompt generator." },
];

export const sampleStudioSteps = [
  { title: "Script", kind: "ai", note: "AngleOS writes it from your angle and the course skill." },
  { title: "Storyboard", kind: "ai", note: "Scene-by-scene plan with timing." },
  { title: "Image prompts", kind: "ai", note: "One copy-ready prompt per scene." },
  { title: "Generate images", kind: "tool", note: "Made in an outside tool. You tick it off when done." },
  { title: "Video prompts", kind: "ai", note: "Motion prompts for each image." },
  { title: "Generate video clips", kind: "tool", note: "Made in an outside tool." },
  { title: "Voice over", kind: "tool", note: "Made in an outside tool." },
  { title: "Edit and export", kind: "tool", note: "Final cut in your editor." },
];

export const sampleAngles = [
  {
    id: "a1",
    subAvatar: "Night-shift nurses",
    desire: "Fall asleep fast in daylight",
    angle: "“I sleep when the sun is up and my brain still thinks it's a shift.”",
    awareness: "Problem aware",
    hooks: ["Day-sleeping is a different sport.", "Blackout curtains weren't enough. This was.", "Why your 3pm sleep feels like 20 minutes"],
    risk: "Needs proof for any sleep-quality claim.",
  },
  {
    id: "a2",
    subAvatar: "Anxious overthinkers",
    desire: "Switch the mind off at night",
    angle: "“My body is tired, my head isn't.”",
    awareness: "Solution aware",
    hooks: ["It's not insomnia. It's input.", "I stopped scrolling and started sleeping.", "The 10-second wind-down nobody told me about"],
    risk: "Avoid medical or anxiety-cure language.",
  },
  {
    id: "a3",
    subAvatar: "Frequent flyers",
    desire: "Arrive rested, not wrecked",
    angle: "“Economy class at 36,000 feet, and I slept.”",
    awareness: "Most aware",
    hooks: ["The one thing in my carry-on that mattered.", "Flight attendants have been doing this for years.", "Don't land tired."],
    risk: "Check any comparison claims against the project facts list.",
  },
];

export const sampleSwipe = [
  { id: "w1", title: "“Stop paying for sleep that doesn't work”", brand: "Somna", format: "UGC", tags: ["Problem hook", "Stage 3"], gradient: "from-blue-500/40 to-violet-500/40" },
  { id: "w2", title: "Day 1 → Day 365 of no sleep", brand: "NightLabs", format: "Skeleton", tags: ["Escalation", "Stage 2"], gradient: "from-emerald-500/40 to-cyan-500/40" },
  { id: "w3", title: "Nine out of ten surgeons say…", brand: "RestWell", format: "VSL", tags: ["Authority", "Stage 4"], gradient: "from-amber-500/40 to-rose-500/40" },
  { id: "w4", title: "My husband thought I'd lost it", brand: "Calm Co", format: "Text on screen", tags: ["Story", "Stage 3"], gradient: "from-fuchsia-500/40 to-indigo-500/40" },
  { id: "w5", title: "The mask NASA engineers copied", brand: "Lumen", format: "Static ad", tags: ["Mechanism", "Stage 4"], gradient: "from-sky-500/40 to-teal-500/40" },
  { id: "w6", title: "Why you wake up at 3am", brand: "Deepr", format: "AI voiceover", tags: ["Curiosity", "Stage 3"], gradient: "from-orange-500/40 to-pink-500/40" },
];

export const sampleHookd = [
  { id: "g1", brand: "Somna", copy: "Wake up feeling like you actually slept. Try risk-free for 30 days.", days: 142, score: "Winning", gradient: "from-blue-500/40 to-violet-500/40" },
  { id: "g2", brand: "RestWell", copy: "I tried everything for my sleep. This is the only thing that worked.", days: 88, score: "Scaling", gradient: "from-amber-500/40 to-rose-500/40" },
  { id: "g3", brand: "NightLabs", copy: "Your bedroom isn't dark enough. Here's the proof.", days: 61, score: "Growing", gradient: "from-emerald-500/40 to-cyan-500/40" },
  { id: "g4", brand: "Lumen", copy: "The 8-hour myth, and what to do instead.", days: 23, score: "Testing", gradient: "from-sky-500/40 to-teal-500/40" },
];

export const usageDays = [0.4, 0.9, 0.2, 1.3, 0.8, 1.9, 0.6, 1.1, 0.3, 1.7, 2.2, 0.9, 0.5, 1.4];

export const adminStats = [
  { label: "Course transcripts", value: "94", note: "in the folder, to be loaded in Phase 1" },
  { label: "Playbook modules", value: "37", note: "00 to 24, plus 7 animation modules" },
  { label: "Evolve prompts", value: "8", note: "private, admin only" },
  { label: "Known gaps", value: "3", note: "missing lessons listed in the manifest" },
];

export const promptFiles = [
  { name: "Project Goal Prompt", file: "research-project-goal-prompt.txt", use: "Standing instructions for research and project chat" },
  { name: "Desire", file: "evolve-desire-prompt.txt", use: "Research step: mass desires" },
  { name: "New Information", file: "evolve-new-information-prompt.txt", use: "Research step: new information" },
  { name: "New Mechanism", file: "evolve-new-mechanism-prompt.txt", use: "Research step: mechanisms" },
  { name: "Angle Identifier", file: "evolve-angle-identifier-prompt.txt", use: "Angle Generator" },
  { name: "Video Script", file: "evolve-video-script-prompt.txt", use: "Script Writer" },
  { name: "Static Ads", file: "evolve-static-ads-prompts.txt", use: "Static Ad Builder" },
  { name: "Ad Learnings Call", file: "evolve-ad-learnings-call-analysis-prompt.txt", use: "Later: weekly learnings report" },
];

export const contextChecklist = [
  { item: "Avatar and sub-avatars", status: "ok" },
  { item: "Core desire", status: "ok" },
  { item: "Awareness level", status: "ok" },
  { item: "Market sophistication stage", status: "thin" },
  { item: "Mechanism and new information", status: "thin" },
  { item: "Proof and facts list", status: "ok" },
  { item: "Customer quotes", status: "missing" },
  { item: "Offer, margin and break-even ROAS", status: "ok" },
] as const;
