import { isRouteErrorResponse, useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    console.error(error);
    return error.statusText;
  } else {
    console.error(`error handling ${error}`);
    return <></>;
  }
}