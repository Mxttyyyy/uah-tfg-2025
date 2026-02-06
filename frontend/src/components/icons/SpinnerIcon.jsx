/* ICONO SPINNER */
export default function SpinnerIcon({ className = "", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <radialGradient
        id="spinnerGradient"
        cx=".66"
        fx=".66"
        cy=".3125"
        fy=".3125"
        gradientTransform="scale(1.5)"
      >
        <stop offset="0" stopColor="currentColor" />
        <stop offset=".3" stopColor="currentColor" stopOpacity=".9" />
        <stop offset=".6" stopColor="currentColor" stopOpacity=".6" />
        <stop offset=".8" stopColor="currentColor" stopOpacity=".3" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>

      <circle
        transformOrigin="center"
        fill="none"
        stroke="url(#spinnerGradient)"
        strokeWidth="15"
        strokeLinecap="round"
        strokeDasharray="200 1000"
        strokeDashoffset="0"
        cx="100"
        cy="100"
        r="70"
      />

      <circle
        transformOrigin="center"
        fill="none"
        opacity=".2"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
        cx="100"
        cy="100"
        r="70"
      />
    </svg>
  );
}

