// Room-scoped difficulty rules. Old saves and clients that omit the field stay Regular.
export const DIFFICULTY_EASY = "easy";
export const DIFFICULTY_REGULAR = "regular";
export const DIFFICULTY_CHALLENGE = "challenge";
export const DIFFICULTIES = Object.freeze([
  DIFFICULTY_EASY,
  DIFFICULTY_REGULAR,
  DIFFICULTY_CHALLENGE,
]);

export const normalizeDifficulty = (value) =>
  DIFFICULTIES.includes(value) ? value : DIFFICULTY_REGULAR;

export const challengeAnteActive = (room) =>
  normalizeDifficulty(room?.difficulty) === DIFFICULTY_CHALLENGE
  && (room?.floor === 2 || room?.floor === 3);

export const difficultyAnte = (room, value) =>
  challengeAnteActive(room) ? Math.ceil(Math.max(0, value) * 1.5) : value;

export const challengeRewardsActive = (room) =>
  normalizeDifficulty(room?.difficulty) === DIFFICULTY_CHALLENGE;

export const difficultyRewardValue = (room, normalValue) =>
  challengeRewardsActive(room) ? Math.floor(Math.max(0, normalValue) / 2) : normalValue;
