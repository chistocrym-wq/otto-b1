import { useEffect, useState } from 'react';

const STORAGE_KEY = 'otto-lesen-teil2-progress-v1';

interface LesenTeil2Progress {
  lastCompleted: number;
  dailyDate: string;
  dailyCompleted: number;
  dailySuccessful: number;
}

const getToday = () => {
  return new Date().toISOString().slice(0, 10);
};

const createEmptyProgress = (): LesenTeil2Progress => ({
  lastCompleted: 0,
  dailyDate: getToday(),
  dailyCompleted: 0,
  dailySuccessful: 0,
});

const getInitialProgress = (): LesenTeil2Progress => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return createEmptyProgress();
    }

    const parsed = JSON.parse(saved) as LesenTeil2Progress;
    const today = getToday();

    if (parsed.dailyDate !== today) {
      return {
        lastCompleted: parsed.lastCompleted || 0,
        dailyDate: today,
        dailyCompleted: 0,
        dailySuccessful: 0,
      };
    }

    return {
      lastCompleted: parsed.lastCompleted || 0,
      dailyDate: parsed.dailyDate || today,
      dailyCompleted: parsed.dailyCompleted || 0,
      dailySuccessful: parsed.dailySuccessful || 0,
    };
  } catch {
    return createEmptyProgress();
  }
};

export function useLesenTeil2Progress() {
  const [progress, setProgress] =
    useState<LesenTeil2Progress>(getInitialProgress);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(progress)
      );
    } catch {
      // localStorage недоступен.
    }
  }, [progress]);

  const record = (
    taskIndex: number,
    successful: boolean
  ) => {
    setProgress((previous) => {
      const today = getToday();
      const newDay = previous.dailyDate !== today;

      return {
        lastCompleted: Math.max(
          previous.lastCompleted,
          taskIndex + 1
        ),

        dailyDate: today,

        dailyCompleted:
          (newDay ? 0 : previous.dailyCompleted) + 1,

        dailySuccessful:
          (newDay ? 0 : previous.dailySuccessful) +
          (successful ? 1 : 0),
      };
    });
  };

  const restart = () => {
    setProgress((previous) => ({
      ...previous,
      lastCompleted: 0,
    }));
  };

  return {
    progress,
    record,
    restart,
  };
}