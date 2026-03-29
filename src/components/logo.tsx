import Image from "next/image";

type LogoProps = {
  size?: number;
  withWordmark?: boolean;
  subtitle?: string;
};

export function Logo({
  size = 44,
  withWordmark = true,
  subtitle = "Concierge shopping assistant",
}: LogoProps) {
  return (
    <>
      <Image
        className="brand-mark brand-mark-image"
        src="/cartpilot-logo.svg"
        alt="CartPilot logo"
        width={size}
        height={size}
      />
      {withWordmark ? (
        <span>
          <strong>CartPilot AI</strong>
          <small>{subtitle}</small>
        </span>
      ) : null}
    </>
  );
}
