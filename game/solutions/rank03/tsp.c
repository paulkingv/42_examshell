//# headers | Headers & t_city | given
//! Given by the exam: the headers and the city type, an x and a y.
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <float.h>

typedef struct s_city
{
	float x;
	float y;
}	t_city;

//# distance | distance()
//! Straight-line distance between two cities (Pythagoras).
//? Declare: two cities in, a float out
float	distance(t_city a, t_city b)
{
//? The gap between them along x
	float	dx = a.x - b.x;
//? The gap between them along y
	float	dy = a.y - b.y;

//? Square both gaps, add them, take the square root
	return (sqrtf(dx * dx + dy * dy));
}

//# total_distance | total_distance()
//! Length of a whole tour: every hop along the path, plus the hop back to the start.
//? Declare: the cities, the visiting order, and the count
float	total_distance(t_city *cities, int *path, int n)
{
//? The sum starts at 0
	float	total = 0;
//? Start at the first stop
	int		i = 0;

//? For every stop that has a next one
	while (i < n - 1)
	{
//? Add the hop from this stop to the next || path holds city numbers. cities[path[i]] is the city visited at step i.
		total += distance(cities[path[i]], cities[path[i + 1]]);
//? Next stop
		i++;
	}
//? Add the hop from the last city back to the first || The tour is a closed loop.
	total += distance(cities[path[n - 1]], cities[path[0]]);
//? Return the sum
	return (total);
}

//# swap | swap()
//! Exchange two ints.
//? Declare: two pointers to ints
void	swap(int *a, int *b)
{
//? Save the first value
	int	tmp = *a;

//? Copy the second value into the first
	*a = *b;
//? Put the saved value into the second
	*b = tmp;
}

//# solve | solve()
//! Try every visiting order: put each remaining city at the current position in turn, order the rest, then swap back. Keep the shortest tour.
//? Declare: the cities, the order, the count, the position to fill, and a pointer to the best length so far
void	solve(t_city *cities, int *path, int n, int pos, float *min)
{
//? Declare a float for a tour length
	float	d;
//? Candidates start at the current position
	int		i = pos;

//? Is the order complete?
	if (pos == n)
	{
//? Measure this tour
		d = total_distance(cities, path, n);
//? Is it shorter than the best so far?
		if (d < *min)
//? Then it is the new best
			*min = d;
//? Go back and try other orders
		return ;
	}
//? For every city not placed yet
	while (i < n)
	{
//? Bring that city to the current position
		swap(&path[pos], &path[i]);
//? Order the rest
		solve(cities, path, n, pos + 1, min);
//? Swap back || The undo, so the next candidate starts from the same order.
		swap(&path[pos], &path[i]);
//? Next candidate
		i++;
	}
}

//# main | main() | given
//! Given by the exam: reads up to 11 cities, starts the search at position 1 (city 0 stays first, because a loop can start anywhere) and prints the best length.
int	main(void)
{
	t_city	cities[11];
	int		n = 0;

	while (n < 11 && fscanf(stdin, "%f, %f", &cities[n].x, &cities[n].y) == 2)
		n++;
	if (n < 2)
	{
		printf("0.00\n");
		return (0);
	}
	int path[11];
	for (int i = 0; i < n; i++)
		path[i] = i;
	float min = FLT_MAX;
	solve(cities, path, n, 1, &min);
	printf("%.2f\n", min);
	return (0);
}
