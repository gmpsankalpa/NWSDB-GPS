import { Droplets, Home, Phone, Mail, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 sm:py-12 px-4 mt-auto">
      <div className="container mx-auto max-w-6xl">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Droplets size={20} className="sm:w-6 sm:h-6" />
              </div>
              <span className="font-bold text-base sm:text-lg">NWSDB GPS Connect</span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm">
              National Water Supply & Drainage Board's digital platform for managing water connection GPS captures
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">Contact Us</h4>
            <div className="space-y-2 text-xs sm:text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Phone size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span>1939 (24/7 Hotline)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="break-all">info@waterboard.lk</span>
              </div>
              <div className="flex items-center gap-2">
                <Home size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span>Galle Road, Ratmalana</span>
              </div>
            </div>
          </div>
          
          <div className="sm:col-span-2 md:col-span-1">
            <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">Quick Links</h4>
            <div className="space-y-2 text-xs sm:text-sm text-gray-400">
              <Link to="/about" className="flex items-center gap-2 hover:text-white transition active:scale-95">
                <ArrowRight size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span>About NWSDB</span>
              </Link>
              <Link to="/terms" className="flex items-center gap-2 hover:text-white transition active:scale-95">
                <ArrowRight size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span>Terms & Conditions</span>
              </Link>
              <Link to="/privacy" className="flex items-center gap-2 hover:text-white transition active:scale-95">
                <ArrowRight size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span>Privacy Policy</span>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} National Water Supply & Drainage Board. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
