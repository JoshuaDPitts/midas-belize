'use client';
import { useContext } from 'react';
import { FeaturesContext } from '../context/FeaturesProvider';

export function useFeatures() {
  return useContext(FeaturesContext);
}
