import { Body, Controller, Get, Post, Put, Request } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { DealsService } from '@/deals/deals.service';
import { AuthenticatedRestricted } from '@/decorators/authenticatedRestricted';
import { logger } from '@/logger';
import { NotificationsService } from '@/notifications/notifications.service';
import { User, AccountType } from '@/users/users.entities';
import { UsersService } from '@/users/users.service';
import { XrplModule } from '@/xrpl/xrpl.module';
import { XrplService } from '@/xrpl/xrpl.service';
import { config } from '@/config';

import { InternalServerError } from '../errors';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/loginResponse.dto';
import { SignupResponseDto } from './dto/signupResponse.dto';
import { SignupDto } from './dto/singup.dto';
import { UpdateNotificationsSettingsDto } from './dto/updateNotificationsSettings.dto';
import { UserDetailsResponseDto } from './dto/userDetailsResponse.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UsersService,
    private dealsService: DealsService,
    private notificationsService: NotificationsService,
    private xrplService: XrplService,
  ) { }

  @Get('')
  @AuthenticatedRestricted()
  @ApiResponse({
    status: 200,
    type: UserDetailsResponseDto,
    description: 'Authenticated user details',
  })
  async getUserDetails(@Request() req): Promise<UserDetailsResponseDto> {
    const user: User = req.user;

    const dbUser = await this.userService.findByEmail(user.email);

    return new UserDetailsResponseDto(dbUser);
  }

  @Put('/notifications-settings')
  @AuthenticatedRestricted()
  @ApiResponse({
    status: 200,
    type: UserDetailsResponseDto,
    description: 'Update Notifications Settings',
  })
  async updateNotificationsSettings(
    @Request() req,
    @Body() notificationsSettings: UpdateNotificationsSettingsDto,
  ): Promise<UserDetailsResponseDto> {
    const user: User = req.user;

    const dbUser = await this.userService.updateNotificationsSettings(
      user.id,
      notificationsSettings.desktopNotifications,
      notificationsSettings.emailNotifications,
    );

    return new UserDetailsResponseDto(dbUser);
  }

  @Post('login')
  @ApiResponse({
    status: 200,
    type: LoginResponseDto,
    description: 'Login Token',
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const { web3authToken } = loginDto;

    const token = await this.authService.login(web3authToken);

    return new LoginResponseDto({ token });
  }

  @Post('check-user-exists')
  @ApiResponse({
    status: 200,
    description: 'Check if user exists by email',
  })
  async checkUserExists(@Body() body: { email: string }): Promise<{ exists: boolean }> {
    const { email } = body;
    const user = await this.userService.findByEmail(email);
    return { exists: !!user };
  }

  @Post('signup')
  @ApiResponse({
    status: 200,
    type: SignupResponseDto,
    description: 'Signup',
  })
  async signup(@Body() signupDto: SignupDto): Promise<SignupResponseDto> {
    const { auth0Token, web3authToken, accountType } = signupDto;

    try {
      let email: string;

      if (auth0Token) {
        // Verify Auth0 JWT token
        const auth0Payload =
          await this.authService.verifyAuth0JwtToken(auth0Token);
        email = auth0Payload.payload.email;

        logger.debug({ auth0Payload }, 'Auth0 JWT token verified');
      }

      // Verify Web3Auth JWT token
      const wallet =
        await this.authService.verifyWeb3AuthJwtToken(web3authToken);
      const walletAddress = wallet.address;
      const walletType = wallet.type;

      // Create new user
      const user = await this.userService.create({
        email,
        walletAddress,
        walletType,
        accountType,
      });

      // Create XRPL wallet for investors if XRPL mode is enabled
      if (config.useXrpl && accountType === AccountType.Investor) {
        try {
          logger.debug(`Creating XRPL wallet for investor ${email}`);
          const xrplWallet = this.xrplService.generateInvestorWallet();

          // Setup trustlines
          await this.xrplService.setInvestorTrustlines(xrplWallet);

          // Store wallet in user
          await this.userService.updateById(user.id, {
            xrplWalletAddress: xrplWallet.address,
            xrplWalletSeed: xrplWallet.seed, // TODO: Encrypt this in production
          });

          logger.debug(`XRPL wallet created for investor: ${xrplWallet.address}`);
        } catch (error) {
          logger.error(error, 'Failed to create XRPL wallet for investor');
          // Don't fail signup if XRPL wallet creation fails
        }
      }

      await this.dealsService.assignUserToDeals(user);

      await this.notificationsService.sendAccountCreatedNotification(email);

      return new SignupResponseDto({
        token: await this.authService.login(web3authToken),
      });
    } catch (e) {
      logger.error(e, 'Signup failed');
      throw new InternalServerError('Signup failed');
    }
  }
}
