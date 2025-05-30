import { GameResult } from '../types';

const STORAGE_KEY = 'lottomoji_history';

export const saveGameHistory = (history: GameResult[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving game history:', error);
  }
};

export const loadGameHistory = (): GameResult[] => {
  try {
    const history = localStorage.getItem(STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error loading game history:', error);
    return [];
  }
};