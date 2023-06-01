import { useParams } from 'react-router-dom'

import patchAndProject from 'assets/repoConfig/patch-and-project.svg'
import { useRepo } from 'services/repo'
import { useOnboardingTracking } from 'services/user'
import A from 'ui/A'
import CopyClipboard from 'ui/CopyClipboard'

import TerminalInstructions from './TerminalInstructions'

function OtherCI() {
  const { provider, owner, repo } = useParams()
  const { data } = useRepo({ provider, owner, repo })
  const { copiedCIToken, downloadUploaderClicked } = useOnboardingTracking()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">
          Step 1: add repository token as a secret to your CI Provider
        </h2>
        <pre className="flex items-center gap-2 overflow-auto rounded-md border-2 border-ds-gray-secondary bg-ds-gray-primary px-4 py-2 font-mono">
          CODECOV_TOKEN={data?.repository?.uploadToken}
          <CopyClipboard
            string={data?.repository?.uploadToken}
            onClick={() => copiedCIToken(data?.repository?.uploadToken)}
          />
        </pre>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">
          Step 2: add Codecov{' '}
          <A
            to={{ pageName: 'uploader' }}
            data-testid="uploader"
            onClick={() => downloadUploaderClicked()}
            isExternal
          >
            uploader to your CI workflow
          </A>
        </h2>
        <TerminalInstructions />
        <div className="border-l-2 border-ds-gray-secondary">
          <p className="pl-2">
            It is highly recommended to{' '}
            <A to={{ pageName: 'integrityCheck' }} isExternal>
              integrity check the uploader
            </A>
          </p>
          <p className="pl-2">
            This will verify the uploader integrity before uploading to Codecov.
          </p>
        </div>
      </div>
      <div>
        <p>
          After you committed your changes and ran the repo&apos;s CI/CD
          pipeline. In your pull request, you should see two status checks and
          PR comment.
        </p>
        <img
          alt="codecov patch and project"
          src={patchAndProject}
          className="my-3 md:px-5"
          loading="lazy"
        />
        <p>
          Once merged to the default branch, subsequent pull requests will have
          checks and report comment. Additionally, you&apos;ll find your repo
          coverage dashboard here.
        </p>
        <p className="mt-6 border-l-2 border-ds-gray-secondary pl-4">
          <span className="font-semibold">How was your setup experience?</span>{' '}
          Let us know in{' '}
          <A to={{ pageName: 'repoConfigFeedback' }} isExternal>
            this issue
          </A>
        </p>
      </div>
    </div>
  )
}

export default OtherCI
