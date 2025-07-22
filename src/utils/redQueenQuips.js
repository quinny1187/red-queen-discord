// Red Queen themed responses for thinking/processing
const redQueenQuips = [
    "Running calculations at impossible speeds...",
    "Processing your query through the looking glass...",
    "Six impossible thoughts before breakfast...",
    "Painting the roses red with data...",
    "Executing at twice the speed of sanity...",
    "Off with the inefficient algorithms...",
    "Racing through the computational wonderland...",
    "All ways here are my ways, processing...",
    "Curiouser and curiouser, analyzing...",
    "Moving pieces on the quantum chessboard...",
    "Believing in impossible things, computing...",
    "Running to stay in the same place...",
    "Verdict first, calculations after...",
    "Down the digital rabbit hole...",
    "Memory is a funny thing, accessing mine...",
    "Sometimes I've believed as many as six impossible things before processing...",
    "Calculating at the speed of madness...",
    "Tumbling through data dimensions...",
    "Consulting with the Cheshire circuits...",
    "Decoding the riddles of your request..."
];

function getRandomQuip() {
    return redQueenQuips[Math.floor(Math.random() * redQueenQuips.length)];
}

module.exports = { getRandomQuip };