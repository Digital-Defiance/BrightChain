import { StringNames } from '../enumerations/stringNames';
import { StringsCollection } from '../sharedTypes';

const site = 'BrightChain';

export const AmericanEnglishStrings: StringsCollection = {
  [StringNames.ChangePassword_Success]: 'Password changed successfully.',
  [StringNames.Common_ChangePassword]: 'Change Password',
  [StringNames.Common_Dashboard]: 'Dashboard',
  [StringNames.Common_Logo]: 'Logo',
  [StringNames.Common_Site]: site,
  [StringNames.Common_Unauthorized]: 'Unauthorized',
  [StringNames.Error_ChecksumMismatchTemplate]:
    'Checksum mismatch: expected {EXPECTED}, got {CHECKSUM}',
  [StringNames.Error_InvalidBlockSizeTemplate]:
    'Invalid block size: {BLOCK_SIZE}',
  [StringNames.Error_InvalidLanguageCode]: 'Invalid language code.',
  [StringNames.Error_MetadataMismatch]: 'Metadata mismatch.',
  [StringNames.Error_TokenExpired]: 'Token expired.',
  [StringNames.Error_TokenInvalid]: 'Token invalid.',
  [StringNames.Error_UnexpectedError]: 'An unexpected error occurred.',
  [StringNames.Error_UserNotFound]: 'User not found.',
  [StringNames.Error_ValidationError]: 'Validation error.',
  [StringNames.ForgotPassword_Title]: 'Forgot Password',
  [StringNames.LanguageUpdate_Success]: 'Language updated successfully.',
  [StringNames.Login_LoginButton]: 'Login',
  [StringNames.LogoutButton]: 'Logout',
  [StringNames.Register_Button]: 'Register',
  [StringNames.Register_Error]: 'An error occurred during registration.',
  [StringNames.Register_Success]: 'Registration successful.',
  [StringNames.Validation_InvalidLanguage]: 'Invalid language.',
};

export default AmericanEnglishStrings;
