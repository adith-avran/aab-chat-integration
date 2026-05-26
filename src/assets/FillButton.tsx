// Fillbutton.tsx
import Button, { ButtonProps } from "@cloudscape-design/components/button";
import "./FillButton.css";

export default function FillButton({ children, ...props }: ButtonProps) {
  return (
    <div className="fill-btn-wrap">
      <Button {...props}>{children}</Button>
    </div>
  );
}