import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Questionnaire, { buildBuyerProfile } from '../../../pages/buyer/Questionnaire';

vi.mock('axios');

vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({ updateProfile: vi.fn(), fetchRecommendations: vi.fn(), loading: false }),
}));
vi.mock('../../../context/BasketContext', () => ({
  useBasket: () => ({ refreshReward: vi.fn() }),
}));
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'buyer1' } }),
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

describe('buildBuyerProfile (pure NLP generation)', () => {
  it('returns an empty string when there is nothing to describe', () => {
    expect(buildBuyerProfile({}, null)).toBe('');
  });

  it('describes household composition alone', () => {
    expect(buildBuyerProfile({ household: 'solo' }, null)).toBe("You're part of a single occupant.");
  });

  it('appends "with pets" when the buyer has pets and pet-friendliness matters', () => {
    expect(buildBuyerProfile({ household: 'couple', hasPets: true, petPref: 'pet_durable' }, null))
      .toBe("You're part of a couple with pets.");
  });

  it('does not mention pets when petPref is explicitly "pets do not affect choices"', () => {
    expect(buildBuyerProfile({ household: 'couple', hasPets: true, petPref: 'pet_no' }, null))
      .toBe("You're part of a couple.");
  });

  it('mentions pets alone when there is no household answer', () => {
    expect(buildBuyerProfile({ hasPets: true, petPref: 'pet_style' }, null))
      .toBe('You have pets at home.');
  });

  it('describes home usage when only one use is selected', () => {
    expect(buildBuyerProfile({ homeUse: ['work'] }, null))
      .toBe('Your home is mainly for working from home.');
  });

  it('combines household and multiple home uses into one sentence', () => {
    expect(buildBuyerProfile({ household: 'family_y', homeUse: ['relax', 'cooking'] }, null))
      .toBe("You're part of a family with young children, and your home is mainly for relaxing and family time and cooking and dining.");
  });

  it('treats "mixed" home use as a balanced-mix phrase regardless of other selections', () => {
    expect(buildBuyerProfile({ homeUse: ['mixed'] }, null))
      .toBe('Your home is mainly for a balanced mix of everyday activities.');
  });

  it('joins style, budget and priorities into a second sentence', () => {
    expect(buildBuyerProfile({ style: 'scandi', budget: 'invest', priorities: ['durable', 'safety'] }, null))
      .toBe("You're drawn to a Scandinavian style, working with a premium budget, and care most about long-lasting materials and safety and security.");
  });

  it('treats an "unsure" style answer as openness to any style', () => {
    expect(buildBuyerProfile({ style: 'unsure' }, null))
      .toBe("You're open to any style.");
  });

  it('appends the bed count and pluralises "matter" correctly for multiple traits', () => {
    expect(buildBuyerProfile({ lifestyleTraits: ['eco', 'security'] }, { bedrooms: 3 }))
      .toBe('Eco-friendly choices and home security matter to you too, all across your 3-bed home.');
  });

  it('uses singular "matters" for exactly one trait, with no plot given', () => {
    expect(buildBuyerProfile({ lifestyleTraits: ['eco'] }, null))
      .toBe('Eco-friendly choices matters to you too.');
  });

  it('falls back to a plain bed-count sentence when there are no traits but a plot is known', () => {
    expect(buildBuyerProfile({}, { bedrooms: 4 })).toBe('It all comes together across your 4-bed home.');
  });
});

describe('Questionnaire flow (component)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url.includes('/plots/my')) return Promise.resolve({ data: { plot: { plotNumber: '12', development: 'Oakfield', bedrooms: 3, bathrooms: 2 } } });
      if (url.includes('/questionnaire/status')) return Promise.resolve({ data: { completed: false } });
      return Promise.resolve({ data: {} });
    });
  });

  it('starts on the intro screen and advances through the step flow as answers are given', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Questionnaire />
      </MemoryRouter>
    );

    expect(await screen.findByText(/help us personalise/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /let's get started/i }));
    expect(await screen.findByText(/who will be living in your new home/i)).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /^next →$/i });
    expect(nextBtn).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /just me/i }));
    expect(nextBtn).toBeEnabled();

    await user.click(nextBtn);
    expect(await screen.findByText(/how do you mostly use your home/i)).toBeInTheDocument();
  });

  it('shows the plot summary alongside the intro screen', async () => {
    render(
      <MemoryRouter>
        <Questionnaire />
      </MemoryRouter>
    );
    const intro = await screen.findByText(/help us personalise/i);
    expect(within(intro.closest('div')).getByText(/12 · Oakfield/)).toBeInTheDocument();
  });
});
