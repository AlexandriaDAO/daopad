import React from 'react';
import { AccountConfigStep } from './AccountConfigStep';
import { AccountPermissionsStep } from './AccountPermissionsStep';
import { AccountRulesStep } from './AccountRulesStep';
import { Check } from 'lucide-react';

export const AccountWizard = ({
  currentStep,
  accountConfig,
  setAccountConfig,
  assets,
  tokenId
}) => {
  const steps = [
    { title: 'Configuration', description: 'Name and assets' },
    { title: 'Permissions', description: 'Access control' },
    { title: 'Approval Rules', description: 'Request policies' }
  ];

  return (
    <div>
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full
                    ${currentStep > index
                      ? 'bg-green-600 text-white'
                      : currentStep === index
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {currentStep > index ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className={`text-sm font-medium ${
                    currentStep >= index ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`
                    w-full h-0.5 mx-4
                    ${currentStep > index ? 'bg-green-600' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current step content */}
      <div className="min-h-[300px]">
        {currentStep === 0 && (
          <AccountConfigStep
            accountConfig={accountConfig}
            setAccountConfig={setAccountConfig}
            assets={assets}
            tokenId={tokenId}
          />
        )}
        {currentStep === 1 && (
          <AccountPermissionsStep
            accountConfig={accountConfig}
            setAccountConfig={setAccountConfig}
          />
        )}
        {currentStep === 2 && (
          <AccountRulesStep
            accountConfig={accountConfig}
            setAccountConfig={setAccountConfig}
          />
        )}
      </div>
    </div>
  );
};