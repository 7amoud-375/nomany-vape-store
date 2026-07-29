import { motion } from "framer-motion";

const StatsCard = ({ title, value, icon: Icon, trend, trendUp, color = "primary" }) => {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend !== null && trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
            trendUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
    </motion.div>
  );
};

export default StatsCard;