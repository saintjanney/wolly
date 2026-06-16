'use client';

interface StatCardProps {
  name: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'indigo' | 'gray';
}

const colorConfig = {
  blue: {
    bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  green: {
    bgColor: 'bg-gradient-to-br from-green-500 to-green-600',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  purple: {
    bgColor: 'bg-gradient-to-br from-purple-500 to-purple-600',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  yellow: {
    bgColor: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
  },
  indigo: {
    bgColor: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
  gray: {
    bgColor: 'bg-gradient-to-br from-gray-500 to-gray-600',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
  },
};

export default function StatCard({
  name,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  color,
}: StatCardProps) {
  const colors = colorConfig[color];

  return (
    <div className="group relative bg-white overflow-hidden rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{name}</p>
            <p className="text-3xl font-bold text-gray-900 mb-4">{value}</p>
            {change && (
              <div className="flex items-center">
                <span
                  className={`text-sm font-medium ${
                    changeType === 'positive'
                      ? 'text-green-600'
                      : changeType === 'negative'
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {change}
                </span>
              </div>
            )}
          </div>
          <div
            className={`p-3 rounded-xl ${colors.iconBg} transition-transform duration-300 group-hover:scale-110`}
          >
            <Icon className={`h-6 w-6 ${colors.iconColor}`} />
          </div>
        </div>
      </div>
      {/* Gradient accent bar */}
      <div
        className={`h-1 ${colors.bgColor} transition-all duration-300 group-hover:h-1.5`}
      />
    </div>
  );
}

