import React from "react";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
  <div className={`p-4 border rounded shadow bg-white dark:bg-gray-800 mb-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
  <div className={`mb-2 font-bold ${className}`} {...props}>
    {children}
  </div>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
  <div className={`space-y-2 ${className}`} {...props}>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = "", ...props }) => (
  <button className={`px-4 py-2 rounded ${className}`} {...props}>
    {children}
  </button>
);
