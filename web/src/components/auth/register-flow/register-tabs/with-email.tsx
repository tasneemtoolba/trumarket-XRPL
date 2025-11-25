import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { useAuth0 } from "@auth0/auth0-react";
import { ADAPTER_STATUS } from "@web3auth/single-factor-auth";

import Button from "src/components/common/button";
import { useWeb3AuthContext } from "src/context/web3-auth-context";
import { AuthService } from "src/controller/AuthAPI.service";
import { checkWeb3AuthInstance, handleOTP, parseToken, uiConsole, handleRequestAuth0JWT } from "src/lib/helpers";
import { EmailSteps } from "src/interfaces/global";
import { useAppSelector } from "src/lib/hooks";
import { selectIsTermsAndConditionsChecked } from "src/store/UiSlice";

import SharedRegisterForm from "./shared-register-form";

import OTPInputWrapper from "../../otp-input-wrapper";

interface WithEmailProps { }

const WithEmail: React.FC<WithEmailProps> = () => {
  const router = useRouter();
  const isTermsAndConditionChecked = useAppSelector(selectIsTermsAndConditionsChecked);
  const { web3authSfa, setIsLoggingIn, setIsLoggedIn, getUserInfo, isLoggingIn, setJWT, init } = useWeb3AuthContext();
  const { getIdTokenClaims, loginWithRedirect } = useAuth0();
  const [emailRegisterStep, setEmailRegisterStep] = useState<EmailSteps>(EmailSteps.STEP_1);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [verificationCodeLoading, setVerificationCodeLoading] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);

  const {
    handleSubmit,
    register,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<{ terms: boolean; email: string }>({
    defaultValues: {
      terms: isTermsAndConditionChecked,
    },
  });

  const handleSubmitForm = async (data: { terms: boolean; email: string }) => {
    setVerificationCodeLoading(true);
    try {
      // Check if user already exists before sending OTP
      const userExists = await AuthService.checkUserExists({ email: data.email });

      if (userExists.exists) {
        toast.error("Account already exists! Please login instead.");
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

      if (web3authSfa.status === ADAPTER_STATUS.CONNECTED) {
        window.location.href = `/account-type?web3authToken=${jwt.idToken}&auth0Token=${auth0Jwt}`;
      }

      setIsLoggedIn(true);
    } catch (err) {
      // Single Factor Auth SDK throws an error if the user has already enabled MFA
      // One can use the Web3AuthNoModal SDK to handle this case
      console.error(err);
    } finally {
      setIsLoggingIn(true);
    }
  };

  return (
    <div>
      {emailRegisterStep === EmailSteps.STEP_1 ? (
        <SharedRegisterForm
          register={register}
          control={control}
          errors={errors}
          setValue={setValue}
          onSubmit={handleSubmit(handleSubmitForm)}
        >
          <Button
            type="submit"
            loading={verificationCodeLoading}
            disabled={verificationCodeLoading}
            classOverrides="w-full tm-btn tm-btn-primary tm-btn-lg"
          >
            <p>Send me an email with code</p>
          </Button>
        </SharedRegisterForm>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <OTPInputWrapper
            email={getValues("email")}
            setVerificationCode={setVerificationCode}
            handleConfirm={handleConfirm}
            resend={() => handleSubmitForm({ terms: true, email: getValues("email") })}
            resendLoading={verificationCodeLoading}
            setEmailRegisterStep={setEmailRegisterStep}
          />
          <Button
            loading={isLoggingIn || confirmationLoading}
            onClick={() => handleConfirm(verificationCode)}
            disabled={verificationCode?.length !== 6 || isLoggingIn || confirmationLoading}
            classOverrides="w-full tm-btn tm-btn-primary tm-btn-lg"
          >
            <p>Confirm</p>
          </Button>
        </div>
      )}
    </div>
  );
};

export default WithEmail;
