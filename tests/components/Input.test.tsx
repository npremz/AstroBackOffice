import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  describe('rendering', () => {
    it('should render input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with data-slot attribute', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toHaveAttribute('data-slot', 'input');
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });

    it('should render with default value', () => {
      render(<Input defaultValue="default text" />);
      expect(screen.getByRole('textbox')).toHaveValue('default text');
    });
  });

  describe('types', () => {
    it('should render text input by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      // HTML default is 'text' when type attribute is not set
      expect(input.getAttribute('type') ?? 'text').toBe('text');
    });

    it('should render email input', () => {
      render(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('should render password input', () => {
      render(<Input type="password" />);
      // Password inputs don't have textbox role
      expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
    });

    it('should render number input', () => {
      render(<Input type="number" />);
      expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
    });

    it('should render search input', () => {
      render(<Input type="search" />);
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('should render tel input', () => {
      render(<Input type="tel" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel');
    });

    it('should render url input', () => {
      render(<Input type="url" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'url');
    });
  });

  describe('interactions', () => {
    it('should handle user typing', async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello World');
      
      expect(input).toHaveValue('Hello World');
    });

    it('should call onChange when value changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      
      render(<Input onChange={handleChange} />);
      
      await user.type(screen.getByRole('textbox'), 'a');
      expect(handleChange).toHaveBeenCalled();
    });

    it('should handle paste', async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.paste('Pasted text');
      
      expect(input).toHaveValue('Pasted text');
    });

    it('should handle clearing', async () => {
      const user = userEvent.setup();
      render(<Input defaultValue="initial" />);
      
      const input = screen.getByRole('textbox');
      await user.clear(input);
      
      expect(input).toHaveValue('');
    });

    it('should be focusable', async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();
    });

    it('should handle onFocus', async () => {
      const user = userEvent.setup();
      const handleFocus = vi.fn();
      
      render(<Input onFocus={handleFocus} />);
      
      await user.click(screen.getByRole('textbox'));
      expect(handleFocus).toHaveBeenCalled();
    });

    it('should handle onBlur', async () => {
      const user = userEvent.setup();
      const handleBlur = vi.fn();
      
      render(<Input onBlur={handleBlur} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();
      
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('states', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should be readonly when readOnly prop is true', () => {
      render(<Input readOnly defaultValue="readonly" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });

    it('should not allow typing when disabled', async () => {
      const user = userEvent.setup();
      render(<Input disabled defaultValue="initial" />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'new text');
      
      expect(input).toHaveValue('initial');
    });

    it('should be required when required prop is true', () => {
      render(<Input required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });
  });

  describe('validation', () => {
    it('should apply aria-invalid for invalid state', () => {
      render(<Input aria-invalid="true" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should support minLength', () => {
      render(<Input minLength={5} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('minLength', '5');
    });

    it('should support maxLength', () => {
      render(<Input maxLength={100} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '100');
    });

    it('should support pattern', () => {
      render(<Input pattern="[A-Za-z]+" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('pattern', '[A-Za-z]+');
    });
  });

  describe('custom className', () => {
    it('should merge custom className', () => {
      render(<Input className="custom-input" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('custom-input');
      expect(input).toHaveClass('rounded-md'); // default class
    });
  });

  describe('accessibility', () => {
    it('should support aria-label', () => {
      render(<Input aria-label="Search query" />);
      expect(screen.getByLabelText('Search query')).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="help-text" />
          <span id="help-text">Enter your email address</span>
        </>
      );
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should work with label element', () => {
      render(
        <>
          <label htmlFor="email-input">Email</label>
          <Input id="email-input" type="email" />
        </>
      );
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });
  });

  describe('security', () => {
    it('should handle XSS attempts in value safely', async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      const maliciousInput = '<script>alert("xss")</script>';
      const input = screen.getByRole('textbox');
      
      await user.type(input, maliciousInput);
      
      // Value should be stored as text, not executed
      expect(input).toHaveValue(maliciousInput);
      // The script should not have been executed (would throw if it did)
    });

    it('should handle special characters in value', async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      // Avoid brackets that userEvent interprets as special keys
      const specialChars = '!@#$%^&*()_+-=|;:\'",.<>?/\\`~';
      await user.type(screen.getByRole('textbox'), specialChars);
      
      expect(screen.getByRole('textbox')).toHaveValue(specialChars);
    });

    it('should handle unicode characters', async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      const unicode = '日本語 العربية 🎉';
      await user.type(screen.getByRole('textbox'), unicode);
      
      expect(screen.getByRole('textbox')).toHaveValue(unicode);
    });
  });

  describe('controlled vs uncontrolled', () => {
    it('should work as controlled input', async () => {
      const user = userEvent.setup();
      const ControlledInput = () => {
        const [value, setValue] = React.useState('');
        return (
          <Input 
            value={value} 
            onChange={(e) => setValue(e.target.value.toUpperCase())} 
          />
        );
      };
      
      render(<ControlledInput />);
      
      await user.type(screen.getByRole('textbox'), 'hello');
      expect(screen.getByRole('textbox')).toHaveValue('HELLO');
    });

    it('should work as uncontrolled input', async () => {
      const user = userEvent.setup();
      render(<Input defaultValue="initial" />);
      
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'new value');
      
      expect(input).toHaveValue('new value');
    });
  });
});

// Need React import for controlled component test
import * as React from 'react';
