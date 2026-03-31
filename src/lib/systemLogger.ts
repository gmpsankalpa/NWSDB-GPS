import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type ActionType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'view' 
  | 'login' 
  | 'logout' 
  | 'status_change' 
  | 'export' 
  | 'other';

export type TargetType = 'application' | 'user' | 'review' | 'system';

interface LogParams {
  action: string;
  actionType: ActionType;
  userId: string;
  userName: string;
  userRole: string;
  userOffice: string;
  details: string;
  targetId?: string;
  targetType?: TargetType;
  metadata?: any;
}

/**
 * Log a system activity to Firestore
 * @param params - Log entry parameters
 */
export async function logSystemActivity(params: LogParams): Promise<void> {
  try {
    await addDoc(collection(db, 'systemLogs'), {
      ...params,
      timestamp: Timestamp.now()
    });
  } catch (error) {
    console.error('Error logging system activity:', error);
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Log application creation
 */
export async function logApplicationCreate(user: any, applicationId: string, fileNo: string): Promise<void> {
  await logSystemActivity({
    action: 'New Application Created',
    actionType: 'create',
    userId: user.uid,
    userName: user.name,
    userRole: user.role,
    userOffice: user.office,
    details: `Created new water connection application with File No: ${fileNo}`,
    targetId: applicationId,
    targetType: 'application',
    metadata: { fileNo }
  });
}

/**
 * Log application status change
 */
export async function logApplicationStatusChange(
  user: any, 
  applicationId: string, 
  fileNo: string,
  oldStatus: string, 
  newStatus: string
): Promise<void> {
  await logSystemActivity({
    action: 'Application Status Updated',
    actionType: 'status_change',
    userId: user.uid,
    userName: user.name,
    userRole: user.role,
    userOffice: user.office,
    details: `Updated application ${fileNo} status from "${oldStatus}" to "${newStatus}"`,
    targetId: applicationId,
    targetType: 'application',
    metadata: { fileNo, oldStatus, newStatus }
  });
}

/**
 * Log application view
 */
export async function logApplicationView(user: any, applicationId: string, fileNo: string): Promise<void> {
  await logSystemActivity({
    action: 'Application Viewed',
    actionType: 'view',
    userId: user.uid,
    userName: user.name,
    userRole: user.role,
    userOffice: user.office,
    details: `Viewed application details for File No: ${fileNo}`,
    targetId: applicationId,
    targetType: 'application',
    metadata: { fileNo }
  });
}

/**
 * Log data export
 */
export async function logDataExport(user: any, exportType: 'pdf' | 'excel', recordCount: number): Promise<void> {
  await logSystemActivity({
    action: 'Data Exported',
    actionType: 'export',
    userId: user.uid,
    userName: user.name,
    userRole: user.role,
    userOffice: user.office,
    details: `Exported ${recordCount} records to ${exportType.toUpperCase()}`,
    targetType: 'system',
    metadata: { exportType, recordCount }
  });
}

/**
 * Log user login
 */
export async function logUserLogin(user: any): Promise<void> {
  await logSystemActivity({
    action: 'User Logged In',
    actionType: 'login',
    userId: user.uid,
    userName: user.name,
    userRole: user.role,
    userOffice: user.office,
    details: `User logged into the system`,
    targetType: 'system'
  });
}

/**
 * Log user logout
 */
export async function logUserLogout(user: any): Promise<void> {
  await logSystemActivity({
    action: 'User Logged Out',
    actionType: 'logout',
    userId: user.uid,
    userName: user.name,
    userRole: user.role,
    userOffice: user.office,
    details: `User logged out of the system`,
    targetType: 'system'
  });
}

/**
 * Log user creation
 */
export async function logUserCreate(
  currentUser: any, 
  newUserId: string, 
  newUserName: string, 
  newUserRole: string
): Promise<void> {
  await logSystemActivity({
    action: 'User Account Created',
    actionType: 'create',
    userId: currentUser.uid,
    userName: currentUser.name,
    userRole: currentUser.role,
    userOffice: currentUser.office,
    details: `Created new user account: ${newUserName} (${newUserRole})`,
    targetId: newUserId,
    targetType: 'user',
    metadata: { newUserName, newUserRole }
  });
}

/**
 * Log user update
 */
export async function logUserUpdate(
  currentUser: any, 
  targetUserId: string, 
  targetUserName: string,
  changes: string
): Promise<void> {
  await logSystemActivity({
    action: 'User Account Updated',
    actionType: 'update',
    userId: currentUser.uid,
    userName: currentUser.name,
    userRole: currentUser.role,
    userOffice: currentUser.office,
    details: `Updated user account: ${targetUserName}. Changes: ${changes}`,
    targetId: targetUserId,
    targetType: 'user',
    metadata: { targetUserName, changes }
  });
}

/**
 * Log user deletion
 */
export async function logUserDelete(
  currentUser: any, 
  targetUserId: string, 
  targetUserName: string
): Promise<void> {
  await logSystemActivity({
    action: 'User Account Deleted',
    actionType: 'delete',
    userId: currentUser.uid,
    userName: currentUser.name,
    userRole: currentUser.role,
    userOffice: currentUser.office,
    details: `Deleted user account: ${targetUserName}`,
    targetId: targetUserId,
    targetType: 'user',
    metadata: { targetUserName }
  });
}

/**
 * Log customer review
 */
export async function logReviewSubmitted(reviewId: string, rating: number, office: string): Promise<void> {
  await logSystemActivity({
    action: 'Customer Review Submitted',
    actionType: 'create',
    userId: 'customer',
    userName: 'Customer',
    userRole: 'Customer',
    userOffice: office,
    details: `Customer submitted a ${rating}-star review for ${office}`,
    targetId: reviewId,
    targetType: 'review',
    metadata: { rating, office }
  });
}
