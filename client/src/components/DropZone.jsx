export default function DropZone({ index, onPlace, disabled, highlight, correct }) {
  const handleClick = () => {
    if (disabled) return;
    onPlace(index);
  };

  let bgColor = 'rgba(255, 255, 255, 0.03)';
  let borderColor = 'rgba(255, 255, 255, 0.1)';

  if (highlight && correct === true) {
    bgColor = 'rgba(34, 197, 94, 0.2)';
    borderColor = 'rgba(34, 197, 94, 0.6)';
  } else if (highlight && correct === false) {
    bgColor = 'rgba(239, 68, 68, 0.2)';
    borderColor = 'rgba(239, 68, 68, 0.6)';
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        flex items-center justify-center
        w-10 h-[100px] shrink-0
        rounded-lg border-2 border-dashed
        transition-all duration-200
        ${disabled ? 'cursor-default opacity-50' : 'cursor-pointer hover:border-[var(--pink)] hover:bg-[rgba(255,45,120,0.1)]'}
        ${highlight ? 'animate-correct' : ''}
      `}
      style={{ background: bgColor, borderColor }}
    >
      {!disabled && (
        <span className="text-gray-500 text-lg">+</span>
      )}
    </button>
  );
}
