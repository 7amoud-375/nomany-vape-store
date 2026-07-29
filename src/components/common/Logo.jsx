import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";

const Logo = ({ className = "" }) => {
  const { language } = useLanguage();

  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
        <span className="text-white font-bold text-lg">N</span>
      </div>
      <span className="text-xl font-bold text-primary dark:text-white">
        {language === "ar" ? "النعماني ستور" : "Nomany Store"}
      </span>
    </Link>
  );
};

export default Logo;