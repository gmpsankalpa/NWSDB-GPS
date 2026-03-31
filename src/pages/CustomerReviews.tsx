import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import Layout from '../components/Layout';
import { Star, Building2, User, Calendar, MessageSquare, X, Trash2 } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, OFFICE_LIST, type Office } from '../lib/offices';
import toast, { Toaster } from 'react-hot-toast';

interface Review {
  id: string;
  office: string;
  fileNumber: string;
  applicantName: string;
  customerId: string;
  rating: number;
  comment: string;
  submittedDate: any;
}

const CustomerReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [officeFilter, setOfficeFilter] = useState<Office | 'All'>('All');
  const [ratingFilter, setRatingFilter] = useState<number | 'All'>('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();

  const handleDeleteReview = async (reviewId: string) => {
    if (!user || user.role !== ROLES.REGIONAL_ENGINEER) {
      toast.error('Unauthorized action');
      return;
    }

    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'customerReviews', reviewId));
      toast.success('Review deleted successfully');
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let q;
    
    // Public access or Regional Engineer viewing all - show all reviews
    if (!user || (user.role === ROLES.REGIONAL_ENGINEER && officeFilter === 'All')) {
      q = query(collection(db, 'customerReviews'), orderBy('submittedDate', 'desc'));
    } else if (user.role === ROLES.REGIONAL_ENGINEER && officeFilter !== 'All') {
      // Regional engineer filtering by office
      q = query(
        collection(db, 'customerReviews'),
        where('office', '==', officeFilter),
        orderBy('submittedDate', 'desc')
      );
    } else {
      // Acting officer sees only their office reviews
      q = query(
        collection(db, 'customerReviews'),
        where('office', '==', user.office),
        orderBy('submittedDate', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reviewsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];
        setReviews(reviewsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching reviews:', error);
        toast.error('Error loading reviews');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, officeFilter]);

  const filteredReviews = reviews.filter(review => {
    if (ratingFilter === 'All') return true;
    return review.rating === ratingFilter;
  });

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0
      ? ((reviews.filter(r => r.rating === rating).length / reviews.length) * 100).toFixed(0)
      : '0'
  }));

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Toaster position="top-right" />

      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Customer Reviews</h1>
        <p className="text-sm sm:text-base text-gray-600">Feedback from water connection applicants</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 sm:p-4 lg:p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-xs sm:text-sm text-blue-100">Total Reviews</span>
            <MessageSquare className="text-blue-200 flex-shrink-0" size={18} />
          </div>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{reviews.length}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-3 sm:p-4 lg:p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-xs sm:text-sm text-yellow-100">Avg Rating</span>
            <Star className="text-yellow-200 flex-shrink-0" size={18} />
          </div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{averageRating}</p>
            <span className="text-xs sm:text-sm text-yellow-100">/ 5.0</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-3 sm:p-4 lg:p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-xs sm:text-sm text-green-100">5-Star</span>
            <Star className="text-green-200 fill-green-200 flex-shrink-0" size={18} />
          </div>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{reviews.filter(r => r.rating === 5).length}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-3 sm:p-4 lg:p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-xs sm:text-sm text-orange-100">Low Ratings</span>
            <Star className="text-orange-200 flex-shrink-0" size={18} />
          </div>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{reviews.filter(r => r.rating <= 2).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {user && user.role === ROLES.REGIONAL_ENGINEER && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Office</label>
              <select
                value={officeFilter}
                onChange={(e) => setOfficeFilter(e.target.value as Office | 'All')}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base"
              >
                <option value="All">All Offices</option>
                {OFFICE_LIST.map(office => (
                  <option key={office.value} value={office.value}>{office.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Rating</label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base"
            >
              <option value="All">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          {(officeFilter !== 'All' || ratingFilter !== 'All') && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setOfficeFilter('All');
                  setRatingFilter('All');
                }}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] text-gray-700 rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium"
              >
                <X size={16} className="flex-shrink-0" />
                <span>Clear Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Rating Distribution</h3>
        <div className="space-y-2 sm:space-y-3">
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 w-14 sm:w-20 flex-shrink-0">
                <span className="text-xs sm:text-sm font-medium text-gray-700">{rating}</span>
                <Star size={14} className="text-yellow-400 fill-yellow-400 sm:w-4 sm:h-4" />
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden min-w-0">
                <div
                  className="bg-yellow-400 h-full rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="text-xs sm:text-sm text-gray-600 w-16 sm:w-20 text-right flex-shrink-0">
                {count} ({percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="bg-white p-8 sm:p-12 rounded-xl shadow-sm border border-gray-200 text-center">
            <MessageSquare size={40} className="mx-auto text-gray-400 mb-3 sm:mb-4 sm:w-12 sm:h-12" />
            <p className="text-gray-600 text-base sm:text-lg">No reviews found</p>
            <p className="text-gray-500 text-xs sm:text-sm mt-2">
              {ratingFilter !== 'All' || officeFilter !== 'All'
                ? 'Try adjusting your filters'
                : 'Customer reviews will appear here'}
            </p>
          </div>
        ) : (
          filteredReviews.map(review => (
            <div key={review.id} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={18}
                          className={cn(
                            'sm:w-5 sm:h-5',
                            star <= review.rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-base sm:text-lg font-bold text-gray-900">{review.rating}.0</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User size={14} className="flex-shrink-0 sm:w-4 sm:h-4" />
                      <span className="font-medium break-words">{review.applicantName}</span>
                    </div>
                    <span className="text-gray-400 hidden sm:inline">•</span>
                    <span className="font-mono text-xs ml-5 sm:ml-0 break-all">{review.customerId}</span>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 sm:gap-2 w-full sm:w-auto">
                  <div className="flex flex-col gap-1.5 sm:gap-2 flex-1 sm:flex-none">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Building2 size={14} className="flex-shrink-0 sm:w-4 sm:h-4" />
                      <span className="break-words">{review.office}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                      <Calendar size={14} className="flex-shrink-0 sm:w-4 sm:h-4" />
                      <span className="whitespace-nowrap">{formatDate(review.submittedDate)}</span>
                    </div>
                  </div>
                  
                  {/* Delete button - Regional Engineer only */}
                  {user && user.role === ROLES.REGIONAL_ENGINEER && (
                    <button
                      onClick={() => setDeleteConfirmId(review.id)}
                      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 active:scale-[0.98] transition text-xs sm:text-sm font-medium whitespace-nowrap"
                    >
                      <Trash2 size={14} className="flex-shrink-0 sm:w-4 sm:h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                <p className="text-xs sm:text-sm font-medium text-gray-500 mb-2 break-words">Application: {review.fileNumber}</p>
                <p className="text-sm sm:text-base text-gray-800 leading-relaxed break-words">{review.comment}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="text-red-600" size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Delete Review</h3>
                <p className="text-xs sm:text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6">
              Are you sure you want to delete this customer review? This will permanently remove it from the system.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 active:scale-[0.98] transition font-medium disabled:opacity-50 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteReview(deleteConfirmId)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-[0.98] transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} className="flex-shrink-0" />
                    <span>Delete Review</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default CustomerReviews;
