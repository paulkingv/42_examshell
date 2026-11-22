//# headers | Headers
//! Two headers: one for printing, one for memory and atoi.
//? Header for printf
#include <stdio.h>
//? Header for calloc, free and atoi
#include <stdlib.h>

//# print_subset | print_subset()
//! Print one subset: its numbers separated by spaces, then a line break.
//? Declare: the subset and how many numbers it holds
void	print_subset(int *sub, int size)
{
//? Start at the first number
	int	i = 0;

//? For every number in the subset
	while (i < size)
	{
//? Print the number
		printf("%d", sub[i]);
//? Is this not the last number?
		if (i < size - 1)
//? Then print a space || No space after the last number.
			printf(" ");
//? Next number
		i++;
	}
//? End the line
	printf("\n");
}

//# solve | solve()
//! Each number has two choices: leave it out or take it. Explore both. At the end, print if nothing is missing from the target.
//? Declare: the set and its size, the subset and its size, the index of the number to decide, and what is still missing from the target
void	solve(int *set, int n, int *sub, int size, int i, int target)
{
//? Has every number been decided?
	if (i == n)
	{
//? Is nothing missing from the target?
		if (target == 0)
//? This subset adds up: print it
			print_subset(sub, size);
//? Go back either way
		return ;
	}
//? Choice 1: leave this number out || Same subset, same target, next number.
	solve(set, n, sub, size, i + 1, target);
//? Choice 2: put this number at the end of the subset
	sub[size] = set[i];
//? Go on with a bigger subset and a smaller target || No undo needed: size is passed by value, so the slot is simply reused.
	solve(set, n, sub, size + 1, i + 1, target - set[i]);
}

//# main_setup | main() · setup
//! Work out how many numbers there are and allocate the set and the subset.
//? Start main with the argument count and values
int	main(int argc, char **argv)
{
//? The count of numbers: every argument except the program name and the target
	int	n = argc - 2;
//? Declare the array for the numbers
	int	*set;
//? Declare the array for the current subset
	int	*sub;
//? An index for filling, starting at 0
	int	i = 0;

//? Not even a target given?
	if (argc < 2)
//? Exit with an error
		return (1);
//? Allocate the set || argc slots is always more than n, so the request is never zero-sized.
	set = calloc(argc, sizeof(int));
//? Allocate the subset the same way
	sub = calloc(argc, sizeof(int));
//? Did either allocation fail?
	if (!set || !sub)
	{
//? Free the set
		free(set);
//? Free the subset
		free(sub);
//? Exit with an error
		return (1);
	}
//# main_run | main() · fill & solve
//! Convert the arguments to numbers, run the search, free everything.
//? For every number
	while (i < n)
	{
//? Convert the argument to an int || The +2 skips the program name and the target.
		set[i] = atoi(argv[i + 2]);
//? Next number
		i++;
	}
//? Start the search: empty subset, first number, full target
	solve(set, n, sub, 0, 0, atoi(argv[1]));
//? Free the set
	free(set);
//? Free the subset
	free(sub);
//? Done: success
	return (0);
}
