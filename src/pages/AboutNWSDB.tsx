import { Droplets, Users, Award, Target, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const AboutNWSDB = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12 sm:py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Droplets className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">About NWSDB</h1>
              <p className="text-blue-100 text-sm sm:text-base md:text-lg">National Water Supply & Drainage Board</p>
            </div>
          </div>
          <p className="text-base sm:text-lg md:text-xl text-blue-50 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            Providing safe drinking water and sanitation services to the people of Sri Lanka since 1975
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-12">
        {/* Mission & Vision */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Target className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Our Mission</h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              To provide safe, adequate, and sustainable water supply and sanitation services to all communities 
              in Sri Lanka through innovative solutions, efficient management, and dedicated service excellence.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <Award className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Our Vision</h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              To be the leading provider of water supply and sanitation services in South Asia, recognized 
              for excellence, innovation, and commitment to public health and environmental sustainability.
            </p>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8 sm:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Our History</h2>
          <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
            <p>
              The National Water Supply and Drainage Board (NWSDB) was established in 1975 under the National 
              Water Supply and Drainage Board Act No. 2 of 1974, as an autonomous body under the Ministry of 
              Water Supply and Drainage.
            </p>
            <p>
              Over the past five decades, NWSDB has grown to become the largest water supply and sanitation 
              service provider in Sri Lanka, serving millions of people across urban, semi-urban, and rural areas.
            </p>
            <p>
              The Board has consistently invested in infrastructure development, technology adoption, and human 
              resource development to ensure the delivery of quality services to all Sri Lankans.
            </p>
          </div>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12">
          {[
            { icon: Users, label: 'Population Served', value: '8M+', color: 'blue' },
            { icon: MapPin, label: 'Service Areas', value: '350+', color: 'indigo' },
            { icon: Droplets, label: 'Treatment Plants', value: '600+', color: 'cyan' },
            { icon: Globe, label: 'Service Coverage', value: '45%', color: 'teal' }
          ].map((stat, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-center animate-in fade-in zoom-in duration-700"
              style={{ animationDelay: `${600 + index * 100}ms` }}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3`}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Services Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8 sm:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Our Services</h2>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {[
              {
                title: 'Water Supply',
                description: 'Provision of safe, clean drinking water through an extensive network of treatment plants and distribution systems.'
              },
              {
                title: 'Wastewater Management',
                description: 'Collection, treatment, and disposal of wastewater to protect public health and the environment.'
              },
              {
                title: 'New Connections',
                description: 'Processing and installation of new water connections for residential, commercial, and industrial premises.'
              },
              {
                title: 'Customer Support',
                description: '24/7 customer service through hotline 1939, online platforms, and regional offices across Sri Lanka.'
              }
            ].map((service, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-blue-300 hover:shadow-md transition-all duration-300">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-900">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Contact Us</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="font-semibold text-sm sm:text-base mb-1">24/7 Hotline</div>
                <div className="text-blue-100 text-sm sm:text-base">1939</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="font-semibold text-sm sm:text-base mb-1">Email</div>
                <div className="text-blue-100 text-xs sm:text-sm break-all">info@waterboard.lk</div>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:col-span-2 md:col-span-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="font-semibold text-sm sm:text-base mb-1">Head Office</div>
                <div className="text-blue-100 text-xs sm:text-sm">Galle Road, Ratmalana, Sri Lanka</div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-center animate-in fade-in duration-700 delay-1000">
          <button
            onClick={() => navigate('/')}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 text-sm sm:text-base"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default AboutNWSDB;
