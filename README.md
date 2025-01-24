# Install Supabase

From the root directory of the git repo, run

```
npx supabase --version
```

If the supabase CLI client is not installed, you will be presented something like:

```
Need to install the following packages:
  supabase@2.6.8
Ok to proceed? (y)
```

Tap 'y' then ENTER.

# Login to Supabase

On the command line, run:

```
npx supabase login
```

You should see a message similar to:

Hello from Supabase! Press Enter to open browser and login automatically.

You will be redirected to a browser to login. You will be displayed a verification code to copy back to the CLI, and press ENTER:


```
Enter your verification code:
```

Once you enter the verification code you should be presented with a confimation message on the command line similar to:

You are now logged in. Happy coding!

# Link Supabase Project

Upon installing the first time, you need to link your Supabase project to the checked out repository. Run

```
npx supabase link --project-ref <project-ref>
```

Your <project-ref> can be found by logging into Supabase at:

https://supabase.com/dashboard/project/<your-project>/settings/general

This should have a Project ID near the top of the page.

You should be presented the option to enter the Supabase password for your database, if it has one:

```
Enter your database password (or leave blank to skip)
```

If you have never configured a password for the database itself, it likely does not exist. Just hit ENTER.

The confirmation on the command line should say something similar to:

Finished supabase link.

At this point your repo/supabase/.temp folder should have been populated with several files that are sensitive and not committed to the repo:

- gotrue-version
- pooler-url
- postgres-version
- project-ref
- rest-version
- storage-version

If you need to regenerate the files, run:

```
npx supabase start
```

If the files are still not generated, you can re-initialize:

```
npx supabase init
```

# Deploy Supabase Edge Functions

The Supabase Edge Functions are the mechanisms for the backend to communicate with various integrations, such as Stripe and Calendly.

Check that the Supabase version exists:

```
npx supabase --version
```

This should output a version, such as '2.6.8`

Check that the supabase functions exist:

```
npx supabase functions list
```

You should see a table output similar to the following:

                     ID                  │        NAME         │        SLUG         │ STATUS │ VERSION │  UPDATED AT (UTC)
  ───────────────────────────────────────┼─────────────────────┼─────────────────────┼────────┼─────────┼──────────────────────
    dcaa58b7-4c91-4c33-b996-d3a621c9df93 │ order               │ order               │ ACTIVE │      68 │ 2024-10-10 07:42:39
    618f78b8-8da3-4bed-863d-31fdb8c2f519 │ stripewebhook       │ stripewebhook       │ ACTIVE │      54 │ 2024-10-10 07:42:44
    98ebe0db-f0a7-4ec7-8fb5-2c1b03639c7c │ calendlywebhook     │ calendlywebhook     │ ACTIVE │      51 │ 2024-10-10 07:42:29
    eb7c183b-afa9-41c1-bec3-52da06850b4d │ update-transaction  │ update-transaction  │ ACTIVE │      12 │ 2024-10-10 07:42:48
    485277c9-4569-478c-bd6c-3123479018f9 │ cancel-subscription │ cancel-subscription │ ACTIVE │      11 │ 2024-10-10 07:42:34
```

Note that the name 'order' corresponds to a named function in the table output above.

Deploy functions one at a time:

```
npx supabase functions deploy order
```

If you see an error response similar to:

```
failed to inspect docker image: error during connect: in the default daemon configuration on Windows, the docker client must be run with elevated privileges to connect: Get "http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.47/imag
es/public.ecr.aws/supabase/edge-runtime:v1.66.4/json": open //./pipe/docker_engine: The system cannot find the file specified.
Docker Desktop is a prerequisite for local development. Follow the official docs to install: https://docs.docker.com/desktop
```

It means that Docker Desktop is not installed, running, or accessible on your system.

Travel to the following URL to download: https://www.docker.com/products/docker-desktop/

Alternatively you can enable WSL and run the following 2 commands:

Powershell
```
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

You will need to restart your computer after this.

For Linux/Ubuntu:

```
sudo apt update && sudo apt upgrade -y
```

Install docker engine:

```
sudo apt install docker.io -y
```

Start Docker and Enable It on Boot:

```
sudo systemctl start docker
sudo systemctl enable docker
```

Verify Docker Installation:

```
docker --version
```

Finally navigate back to the root directory of the github repo and deploy the edge functions you want:

```
npx supabase functions deploy order
```
