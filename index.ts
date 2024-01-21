import express, { Request as _Request } from 'express';
import { RconClient } from 'rconify';
import path from 'path';
import session from 'express-session';
import svgCaptcha from 'svg-captcha';
import rateLimit from 'express-rate-limit';
require('dotenv').config()

interface Request extends _Request {
    session: any;
    rateLimit: any;
}

interface RconInfo {
    ip: string;
    port: string;
    password: string;
}

class RconController {
    constructor() {

    }

    public async connect(info: RconInfo): Promise<RconClient> {
        const client: RconClient = new RconClient({
            host: info.ip,
            port: parseInt(info.port),
            password: info.password,
            ignoreInvalidAuthResponse: false
        });

        await client.connect();
        return client;
    }

    async sendCommand(command: string, info: RconInfo) {
        const client: RconClient = await this.connect(info);
        const result: string = await client.sendCommand(command);

        client.disconnect();

        return result;
    }
}

class App {
    private app = express();
    private port: number = parseInt(process.env.PORT);
    private rconController: RconController = new RconController();

    constructor() {
        this.app.use(session({
            secret: 'Auz_ae721_47bAZRA_1é1Z4',
            resave: false,
            saveUninitialized: true,
            cookie: {
                maxAge: 10 * 60 * 1000,
            },
        }));
    };

    run() {
        const dir: string = path.join(__dirname, 'public');

        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.static(dir));
        this.app.set('views', dir + "/views");
        this.app.set('view engine', 'ejs');
        this.app.set('trust proxy', 'loopback, linklocal, uniquelocal');

        const connectLimiter = rateLimit({
            windowMs: 5 * 60 * 1000,
            max: 5,
            handler: (req: Request, res: express.Response) => {
                const timeLeft = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
                res.status(429).json({
                    error: `Too many requests, please try again in ${timeLeft} seconds.`,
                });
            },
        });

        const commandLimiter = rateLimit({
            windowMs: 3 * 60 * 1000,
            max: 100,
            handler: (req: Request, res: express.Response) => {
                const timeLeft = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
                res.status(429).json({
                    error: `Too many requests, please try again in ${timeLeft} seconds.`,
                });
            },
        });

        this.app.get('/', (req: Request, res: express.Response) => {
            if (this.isConnected(req)) {
                res.render("commands");
            } else {
                const captcha = this.newCaptchaSvg(req);
                res.render("login", { captcha: captcha });
            }
        });

        this.app.post('/connect', connectLimiter, async (req: Request, res: express.Response) => {

            const { captcha, ip, password, port } = req.body;

            const requestedCaptcha: string = req.session.captcha;

            if (this.isNullOrEmpty(requestedCaptcha)) {
                res.status(400).send({ error: "Unable to validate captcha, please refresh", captcha: this.newCaptchaSvg(req) });
                return;
            }

            if (this.isNullOrEmpty(captcha)) {
                res.status(400).send({ error: "Captcha can not be null or empty", captcha: this.newCaptchaSvg(req) });
                return;
            }

            if (captcha != requestedCaptcha) {
                res.status(403).send({ error: 'Invalid captcha', captcha: this.newCaptchaSvg(req) });
                return;
            }

            if (this.isNullOrEmpty(ip)) {
                res.status(400).send({ error: "IP can not be null or empty", captcha: this.newCaptchaSvg(req) });
                return;
            }

            if (this.isNullOrEmpty(password)) {
                res.status(400).send({ error: "Password can not be null or empty", captcha: this.newCaptchaSvg(req) });
                return;
            }

            if (this.isNullOrEmpty(port)) {
                res.status(400).send({ error: "Port can not be null or empty", captcha: this.newCaptchaSvg(req) });
                return;
            }

            try {
                const client: RconClient = await this.rconController.connect({ ip, password, port });
                client.disconnect();

                req.session.rconInfo = req.body;
                res.sendStatus(200);
            } catch (error) {
                res.send(500).send({ error: "Invalid rcon", captcha: this.newCaptchaSvg(req) });
            }
        });

        this.app.post('/sendCommand', commandLimiter, async (req: Request, res: express.Response) => {
            if (!this.isConnected(req)) {
                res.status(403).json({ error: "Not connected" });
                return;
            }

            const command: string = req.body.command;

            if (this.isNullOrEmpty(command)) {
                res.status(400).json({ error: "Command can not be null or empty" });
                return;
            }

            try {
                const response = await this.rconController.sendCommand(command, req.session.rconInfo);
                res.send(response);
            } catch (error) {
                res.status(500).json({ error: "Error" });
            }
        });

        this.app.post('/disconnect', async (req: Request, res: express.Response) => {
            try {
                req.session.rconInfo = null;
                res.redirect('/');
            } catch (error) {
                res.status(500).json({ error: error });
            }
        });

        this.app.listen(this.port, () => {
            console.log(`Running on port ${this.port}`);
        });
    }

    private newCaptchaSvg(req: Request): string {
        const captcha: svgCaptcha.CaptchaObj = svgCaptcha.create();
        req.session.captcha = captcha.text;

        return captcha.data;
    }

    private isConnected(req: Request): boolean {
        const expirationTime: Date = new Date(req.session.cookie.expires);
        const currentTime: Date = new Date();

        if (expirationTime <= currentTime) {
            req.session.destroy();
            req.session.rconInfo = {};
            return false;
        }

        return req.session.rconInfo != null;
    }

    private isNullOrEmpty(value: string): boolean {
        return value?.trim()?.length > 0 ? false : true;
    }
}

const app: App = new App();
app.run();