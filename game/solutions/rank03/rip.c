//# headers | Headers
//! One header, for printing.
//? Header for puts
#include <stdio.h>

//# unbalanced | unbalanced()
//! Count the minimum number of parentheses to remove: openers that are never closed, plus closers with nothing to close.
//? Declare: it takes the string and returns a count
int	unbalanced(char *s)
{
//? Openers still waiting for a partner: 0
	int	open = 0;
//? Closers with no partner: 0
	int	close = 0;
//? Start at the first character
	int	i = 0;

//? For every character
	while (s[i])
	{
//? Is it an opener?
		if (s[i] == '(')
//? One more is waiting
			open++;
//? Or is it a closer?
		else if (s[i] == ')')
		{
//? Is an opener waiting?
			if (open > 0)
//? Pair them up
				open--;
//? If none is waiting
			else
//? This closer has no partner
				close++;
		}
//? Next character
		i++;
	}
//? Everything left unpaired has to go
	return (open + close);
}

//# solve | solve()
//! Remove exactly the minimum number of parentheses, trying every combination of positions. Print the results that are balanced.
//? Declare: the string, how many to remove, how many are removed, and where to continue from
void	solve(char *s, int to_remove, int removed, int pos)
{
//? Start looking from the given position || Never going back avoids trying the same set of positions twice.
	int		i = pos;
//? A spare char to remember what was removed
	char	c;

//? Have we removed enough?
	if (removed == to_remove)
	{
//? Is what remains balanced?
		if (!unbalanced(s))
//? Print this solution
			puts(s);
//? Go back either way
		return ;
	}
//? For every character from here on
	while (s[i])
	{
//? Is it a parenthesis?
		if (s[i] == '(' || s[i] == ')')
		{
//? Remember it
			c = s[i];
//? Replace it with a space
			s[i] = ' ';
//? Go on: one more removed, continue after this spot
			solve(s, to_remove, removed + 1, i + 1);
//? Put the parenthesis back || The undo, so the next try starts from the same string.
			s[i] = c;
		}
//? Next character
		i++;
	}
}

//# main | main()
//! Check the argument, count the minimum removals, start the search.
//? Start main with the argument count and values
int	main(int argc, char **argv)
{
//? Not exactly one argument?
	if (argc != 2)
//? Exit with an error
		return (1);
//? Search: remove the minimum count, none removed yet, from position 0
	solve(argv[1], unbalanced(argv[1]), 0, 0);
//? Done: success
	return (0);
}
