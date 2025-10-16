import React from 'react';

const AgreementSection = ({ article, title, children }) => {
  return (
    <section className="space-y-3 my-6">
      <h3 className="text-xl font-bold border-b border-gray-300 pb-2">
        <span className="text-gray-600">Article {article}:</span> {title}
      </h3>
      <div className="pl-4">
        {children}
      </div>
    </section>
  );
};

export default AgreementSection;
