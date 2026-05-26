// GradientButton.tsx
import Button, { ButtonProps } from "@cloudscape-design/components/button";
import "./GradientButton.css";

export default function GradientButton({ children, ...props }: ButtonProps) {
  return (
    <div className="gradient-btn-wrap">
      <Button {...props}>{children}</Button>
    </div>
  );
}