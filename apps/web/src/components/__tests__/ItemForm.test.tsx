import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React, { useState } from 'react';
import { Button, Input, Select, Switch } from '../ui/index.js';

interface ItemFormProps {
  onSubmit: (item: any) => void;
  categories: { id: string; name: string }[];
}

const ItemFormTestComponent: React.FC<ItemFormProps> = ({ onSubmit, categories }) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [price, setPrice] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Item name is required');
      return;
    }
    if (!price || Number(price) < 0) {
      setError('Valid price is required');
      return;
    }

    onSubmit({
      name: name.trim(),
      categoryId,
      price: Number(price),
      isVeg,
      isAvailable,
    });
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Item Form">
      {error && <p role="alert">{error}</p>}
      <Input
        label="Item Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Select
        label="Category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
      />
      <Input
        label="Price"
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        required
      />
      <Switch
        label="Available"
        checked={isAvailable}
        onChange={setIsAvailable}
      />
      <Button type="submit">Save Item</Button>
    </form>
  );
};

describe('Item Form Component Test', () => {
  const categories = [
    { id: 'cat-1', name: 'Starters' },
    { id: 'cat-2', name: 'Mains' },
  ];

  it('renders input fields with labels and submits valid item data', () => {
    const handleSubmit = vi.fn();
    render(<ItemFormTestComponent onSubmit={handleSubmit} categories={categories} />);

    const nameInput = screen.getByLabelText(/Item Name/i);
    const priceInput = screen.getByLabelText(/Price/i);
    const submitBtn = screen.getByRole('button', { name: /Save Item/i });

    fireEvent.change(nameInput, { target: { value: 'Crispy Calamari' } });
    fireEvent.change(priceInput, { target: { value: '14.50' } });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'Crispy Calamari',
      categoryId: 'cat-1',
      price: 14.5,
      isVeg: true,
      isAvailable: true,
    });
  });

  it('shows error if name is empty', () => {
    const handleSubmit = vi.fn();
    render(<ItemFormTestComponent onSubmit={handleSubmit} categories={categories} />);

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    expect(screen.getByRole('alert')).toHaveTextContent('Item name is required');
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
