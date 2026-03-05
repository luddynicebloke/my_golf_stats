type UserType = {
  id: string;
  created_at: string;
  email: string;
  avatar: string;
  category: string;
  role: string;
  preferred_distance_unit: string;
};

const User = (props: { user: UserType }) => {
  return (
    <tr class='odd:bg-neutral-700 even:bg-neutral-900 border-b '>
      <th
        scope='row'
        class='px-6 py-4 font-medium text-heading whitespace-nowrap'
      >
        {props.user.email}
      </th>
      <td class='px-6 py-4'>
        {" "}
        {new Date(props.user.created_at).toLocaleDateString()}
      </td>
      <td class='px-6 py-4'>{props.user.category}</td>
      <td class='px-6 py-4'>{props.user.role}</td>
      <td class='px-6 py-4'>{props.user.preferred_distance_unit}</td>
      <td class='px-6 py-4'>{props.user.avatar}</td>
      <td class='px-6 py-4'>
        <a href='#' class='font-medium text-fg-brand hover:underline'>
          Edit
        </a>
      </td>
    </tr>
  );
};

export default User;
