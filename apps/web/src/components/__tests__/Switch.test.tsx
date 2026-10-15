import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Switch } from '../ui/Switch.js';

describe('Switch Component', () => {
  it('renders switch with label and toggles on click', () => {
    const handleChange = vi.fn();
    render(
      <Switch
        checked={false}
        onChange={handleChange}
        label="In Stock Status"
      />
    );

    const switchBtn = screen.getByRole('switch');
    expect(switchBtn).toBeInTheDocument();
    expect(switchBtn).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(switchBtn);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('toggles using Space and Enter keyboard keys for accessibility', () => {
    const handleChange = vi.fn();
    render(
      <Switch
        checked={true}
        onChange={handleChange}
        label="Item Availability"
      />
    );

    const switchBtn = screen.getByRole('switch');
    expect(switchBtn).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(switchBtn, { key: ' ' });
    expect(handleChange).toHaveBeenCalledWith(false);

    fireEvent.keyDown(switchBtn, { key: 'Enter' });
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('does not trigger change when disabled', () => {
    const handleChange = vi.fn();
    render(
      <Switch
        checked={false}
        onChange={handleChange}
        label="Disabled Switch"
        disabled
      />
    );

    const switchBtn = screen.getByRole('switch');
    fireEvent.click(switchBtn);
    expect(handleChange).not.toHaveBeenCalled();
  });
});
