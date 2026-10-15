import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React, { useState } from 'react';

const mockMenuData = [
  {
    id: 'item-1',
    name: 'Margherita Pizza',
    description: 'Fresh basil and mozzarella',
    price: 14.0,
    isVeg: true,
    isAvailable: true,
  },
  {
    id: 'item-2',
    name: 'Pepperoni Pizza',
    description: 'Spicy beef pepperoni',
    price: 16.5,
    isVeg: false,
    isAvailable: true,
  },
  {
    id: 'item-3',
    name: 'Truffle Pasta',
    description: 'Wild mushroom cream',
    price: 22.0,
    isVeg: true,
    isAvailable: false, // SOLD OUT
  },
];

const FilterableMenuTestComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [vegOnly, setVegOnly] = React.useState(false);

  const filtered = mockMenuData.filter((item) => {
    const matchVeg = vegOnly ? item.isVeg : true;
    const matchSearch =
      !searchTerm.trim() ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchVeg && matchSearch;
  });

  return (
    <div>
      <input
        placeholder="Search dishes..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        aria-label="Search dishes"
      />
      <button
        type="button"
        onClick={() => setVegOnly(!vegOnly)}
        aria-label="Toggle Veg Only"
      >
        {vegOnly ? 'Veg Only Active' : 'All Items'}
      </button>

      <div data-testid="items-list">
        {filtered.map((item) => (
          <div key={item.id} data-testid={`item-card-${item.id}`}>
            <h4>{item.name}</h4>
            <p>{item.description}</p>
            <span>${item.price.toFixed(2)}</span>
            {item.isVeg && <span>Vegetarian</span>}
            {!item.isAvailable && <span>Sold out</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Public Menu Filters & Sold-Out Display Component Test', () => {
  it('renders all dishes initially including sold out badge for unavailable items', () => {
    render(<FilterableMenuTestComponent />);

    expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    expect(screen.getByText('Pepperoni Pizza')).toBeInTheDocument();
    expect(screen.getByText('Truffle Pasta')).toBeInTheDocument();
    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });

  it('filters dishes by search keyword', () => {
    render(<FilterableMenuTestComponent />);

    const searchInput = screen.getByLabelText('Search dishes');
    fireEvent.change(searchInput, { target: { value: 'pepperoni' } });

    expect(screen.getByText('Pepperoni Pizza')).toBeInTheDocument();
    expect(screen.queryByText('Margherita Pizza')).not.toBeInTheDocument();
    expect(screen.queryByText('Truffle Pasta')).not.toBeInTheDocument();
  });

  it('filters only vegetarian dishes when Veg Only is toggled', () => {
    render(<FilterableMenuTestComponent />);

    const vegButton = screen.getByLabelText('Toggle Veg Only');
    fireEvent.click(vegButton);

    expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    expect(screen.getByText('Truffle Pasta')).toBeInTheDocument();
    expect(screen.queryByText('Pepperoni Pizza')).not.toBeInTheDocument();
  });
});
