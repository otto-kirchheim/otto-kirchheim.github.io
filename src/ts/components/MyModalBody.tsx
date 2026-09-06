import { type FC, type ReactNode } from 'react';

const MyModalBody: FC<{ className?: string; children?: ReactNode }> = ({ className, children }) => {
  const defaultClass = 'dialog-koerper';
  const additionalClass = className ? ` ${className}` : ' row g-2';

  return (
    <div className={`${defaultClass}${additionalClass}`}>
      {children}
      <div className="text-bg-danger">
        <span id="errorMessage" />
      </div>
    </div>
  );
};
export default MyModalBody;
