/**
 * VietQR dynamic generator and SePay payment metadata helper
 */

export interface VietQrData {
  bankName: string;
  bankCode: string;
  accountNo: string;
  accountName: string;
  amount: number;
  description: string;
  qrImageUrl: string;
}

export function generateVietQr(orderCode: string, totalAmount: number): VietQrData {
  const bankName = process.env.SEPAY_BANK_NAME || 'MBBank';
  const bankCode = 'mbbank'; // VietQR bank code
  const accountNo = process.env.SEPAY_ACCOUNT_NO || '0987654321';
  const accountName = process.env.SEPAY_ACCOUNT_NAME || 'CONG TY CP XE BUYT VIVU';
  
  // Standard VietQR link
  const qrImageUrl = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(accountName)}`;

  return {
    bankName,
    bankCode,
    accountNo,
    accountName,
    amount: totalAmount,
    description: orderCode,
    qrImageUrl,
  };
}
