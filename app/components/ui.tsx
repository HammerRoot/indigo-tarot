import styles from "./ui.module.less";
import { cn } from "@/lib/utils";

export function MysticalBg({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(styles["mystical-bg"], className)}>
      <div className={styles.stars}></div>
      {children}
    </div>
  );
}

export function MysticalCard({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn(styles["mystical-card"], className)} {...props}>
      {children}
    </div>
  );
}

export function MysticalButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button className={cn(styles["mystical-button"], className)} {...props}>
      {children}
    </button>
  );
}

export function MysticalInput({
  className,
  ...props
}: React.ComponentProps<"input"> & React.ComponentProps<"textarea">) {
  const Component = (props as React.ComponentProps<"textarea">).rows ? "textarea" : "input";
  return (
    <Component className={cn(styles["mystical-input"], className)} {...props} />
  );
}
