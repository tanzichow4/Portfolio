import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import Desktop from '../src/Desktop';

it('renders the desktop without crashing', () => {
  const { container } = render(<Desktop />);
  expect(container.firstChild).toBeInTheDocument();
});
