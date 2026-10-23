// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { HealthWellnessInsights } from './HealthWellnessInsights.jsx';

afterEach(cleanup);

const base = { age: 24, height: 172, weight: 70, gender: 'male', currentDate: '2026-10-23', logs: { '2026-10-23': { foods: [] } } };
const bodyImages = (container) => [...container.querySelectorAll('img')].filter((img) => /\/assets\/(male|female)\//.test(img.getAttribute('src') || ''));

describe('body photos are opt-in', () => {
  it('shows no body reference photo while body composition is off', () => {
    const { container } = render(<HealthWellnessInsights state={{ ...base, showBodyComposition: false }} update={() => {}} />);
    expect(bodyImages(container)).toHaveLength(0);
  });

  it('shows the snapshot once the user turns body composition on', () => {
    const { container } = render(<HealthWellnessInsights state={{ ...base, showBodyComposition: true }} update={() => {}} />);
    expect(bodyImages(container).length).toBeGreaterThan(0);
  });
});
