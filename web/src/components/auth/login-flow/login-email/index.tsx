import { useMutation } from "@tanstack/react-query";
import { ADAPTER_STATUS } from "@web3auth/base";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "react-toastify";

import Button from "src/components/common/button";
import EmailInput from "src/components/common/email-input";
import VerificationInputComponent from "src/components/common/verification-input";
import { useWeb3AuthContext } from "src/context/web3-auth-context";
import { AuthService } from "src/controller/AuthAPI.service";
import { EmailSteps } from "src/interfaces/global";
import { handleRequestAuth0JWT, handleOTP, checkWeb3AuthInstance, parseToken } from "src/lib/helpers";

import OTPInputWrapper from "../../otp-input-wrapper";

interface LoginEmailProps { }

const LoginEmail: React.FC<LoginEmailProps> = () => {
  const router = useRouter();
  const { isLoggingIn, init, setIsLoggingIn, web3authSfa, setIsLoggedIn, setJWT } = useWeb3AuthContext();

  const [emailRegisterStep, setEmailRegisterStep] = useState<EmailSteps>(EmailSteps.STEP_1);
  const [verificationCodeLoading, setVerificationCodeLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const {
    handleSubmit,
    register,
    control,
    getValues,
    formState: { errors },
  } = useForm<{ email: string }>();

  const handleObtainJWTToken = useMutation({
    mutationFn: (web3authToken: string) => AuthService.loginUser({ web3authToken }),
  });

  const handleSubmitForm = async (data: { email: string }) => {
    setVerificationCodeLoading(true);
    try {
      // Check if user exists before sending OTP
      const userExists = await AuthService.checkUserExists({ email: data.email });

      if (!userExists.exists) {
        toast.error("Account doesn't exist! Please register first.");
        setVerificationCodeLoading(false);
        return;
      }

      await handleOTP(data.email, () => setEmailRegisterStep(EmailSteps.STEP_2));
    } catch (error) {
      console.error('Error checking user existence:', error);
      toast.error("Error checking account. Please try again.");
    } finally {
      setVerificationCodeLoading(false);
    }
  };

  const handleConfirm = async (OTPcode: string) => {
    setConfirmationLoading(true);
    await handleRequestAuth0JWT(getValues("email"), OTPcode as string, handleAccount);
    setConfirmationLoading(false);
  };

  const handleAccount = async (auth0Jwt: string) => {
    await init();
    // trying logging in with the Single Factor Auth SDK
    try {
      checkWeb3AuthInstance(web3authSfa);

      setIsLoggingIn(true);

      const { email } = parseToken(auth0Jwt);

      const subVerifierInfoArray = [
        {
          verifier: "auth0-passwordless",
          idToken: auth0Jwt!,
        },
      ];

      if (!process.env.NEXT_PUBLIC_WEB3AUTH_CONNECTION_ID) {
        throw new Error("Web3Auth connection ID is not set");
      }
      await web3authSfa.connect({
        verifier: process.env.NEXT_PUBLIC_WEB3AUTH_CONNECTION_ID,
        verifierId: email,
        idToken: auth0Jwt,
      } as any);

      const jwt = await web3authSfa.authenticateUser();

      const user = await handleObtainJWTToken.mutateAsync(jwt.idToken);
      setJWT(user.token);

      setIsLoggedIn(true);

      if (web3authSfa.status === ADAPTER_STATUS.CONNECTED) {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      // Single Factor Auth SDK throws an error if the user has already enabled MFA
      // One can use the Web3AuthNoModal SDK to handle this case
      console.error(err);
      toast.error("Account doesn't exists! Please register");
    } finally {
      setIsLoggingIn(false);
      setConfirmationLoading(false);
    }
  };

  return (
    <>
      {emailRegisterStep === EmailSteps.STEP_1 ? (
        <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-5">
          <EmailInput
            register={register}
            errors={errors}
            placeholder="Enter your email"
          />
          <Button
            disabled={verificationCodeLoading}
            loading={verificationCodeLoading}
            classOverrides="w-full tm-btn tm-btn-primary tm-btn-lg"
          >
            <p>Send me an email with code</p>
          </Button>
        </form>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <OTPInputWrapper
            email={getValues("email")}
            setVerificationCode={setVerificationCode}
            handleConfirm={handleConfirm}
            resend={() => handleSubmitForm({ email: getValues("email") })}
            resendLoading={verificationCodeLoading}
            setEmailRegisterStep={setEmailRegisterStep}
          />
          <Button
            onClick={() => handleConfirm(verificationCode)}
            loading={isLoggingIn || confirmationLoading}
            disabled={verificationCode?.length !== 6 || isLoggingIn || confirmationLoading}
            classOverrides="w-full tm-btn tm-btn-primary tm-btn-lg"
          >
            <p>Confirm</p>
          </Button>
        </div>
      )}
    </>
  );
};

export default LoginEmail;
